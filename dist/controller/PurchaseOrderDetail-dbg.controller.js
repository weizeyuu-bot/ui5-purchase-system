sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/TextArea",
    "sap/m/Label",
    "sap/ui/model/json/JSONModel",
    "myapp/model/models"
], function (Controller, History, MessageToast, MessageBox, Dialog, Button, TextArea, Label, JSONModel, models) {
    "use strict";

    return Controller.extend("myapp.controller.PurchaseOrderDetail", {

        onInit: function () {
            this.getView().setModel(this.getOwnerComponent().getModel("purchaseOrders"), "purchaseOrders");
            this.getView().setModel(new JSONModel({
                supplierOptions: [{ id: "", name: this._getText("pleaseSelect") }].concat(this.getOwnerComponent().getModel("suppliers").getProperty("/suppliers") || []),
                materialOptions: [{ id: "", name: this._getText("pleaseSelect") }].concat(this.getOwnerComponent().getModel("materials").getProperty("/materials") || [])
            }), "selectOptions");
            this.getView().setModel(new JSONModel({
                canEditOrder: false,
                canSubmit: false,
                canApprove: false,
                canReject: false
            }), "ui");
            this._oRejectDialog = null;
            this._oRejectTextArea = null;
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RoutePurchaseOrderDetail").attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: function (oEvent) {
            var sOrderId = oEvent.getParameter("arguments").orderId;
            var oModel = this.getView().getModel("purchaseOrders");
            var aOrders = oModel.getProperty("/purchaseOrders");
            var oOrder = aOrders.find(function (item) {
                return item.id === sOrderId;
            });
            if (oOrder) {
                this._iOrderIndex = aOrders.indexOf(oOrder);
                this.getView().bindElement({
                    path: "/purchaseOrders/" + this._iOrderIndex,
                    model: "purchaseOrders"
                });
                this._refreshActionState();
            }
        },

        onNavBack: function () {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("RoutePurchaseOrderList", {}, true);
            }
        },

        onSave: function () {
            if (!this.getView().getModel("ui").getProperty("/canEditOrder")) {
                MessageToast.show(this._getText("poEditNotAllowed"));
                return;
            }
            models.syncPurchaseOrderPricing(
                this.getOwnerComponent().getModel("purchaseOrders"),
                this.getOwnerComponent().getModel("priceLibrary"),
                this.getOwnerComponent().getModel("suppliers"),
                this.getOwnerComponent().getModel("materials")
            );
            MessageToast.show(this._getText("purchaseOrderSaved"));
            this._refreshActionState();
            this.onNavBack();
        },

        onPricingConditionChange: function () {
            if (this._iOrderIndex === undefined || this._iOrderIndex < 0) {
                return;
            }

            models.syncPurchaseOrderPricing(
                this.getOwnerComponent().getModel("purchaseOrders"),
                this.getOwnerComponent().getModel("priceLibrary"),
                this.getOwnerComponent().getModel("suppliers"),
                this.getOwnerComponent().getModel("materials")
            );
            this._refreshActionState();
        },

        onAddItem: function () {
            if (this._iOrderIndex === undefined || this._iOrderIndex < 0) {
                return;
            }

            var oModel = this.getView().getModel("purchaseOrders");
            var aItems = oModel.getProperty("/purchaseOrders/" + this._iOrderIndex + "/items") || [];
            aItems.push({
                lineId: String((aItems.length + 1) * 10),
                materialId: "",
                materialName: "",
                quantity: 1,
                unit: "",
                unitPrice: 0,
                currency: "CNY",
                amount: "0.00",
                priceRecordId: "",
                priceValidFrom: "",
                priceValidTo: "",
                priceMatched: false,
                priceStatusText: "MISSING",
                priceStatusState: "Error",
                lowestPriceRecordId: "",
                lowestMarketPrice: "0.00",
                lowestMarketSupplierName: "",
                priceBenchmarkText: this._getText("poNoComparablePrice"),
                priceBenchmarkState: "None"
            });
            oModel.setProperty("/purchaseOrders/" + this._iOrderIndex + "/items", aItems);
            this.onPricingConditionChange();
        },

        onSubmitApproval: function () {
            if (!this.getView().getModel("ui").getProperty("/canSubmit")) {
                MessageToast.show(this._getText("poSubmitNotAllowed"));
                return;
            }

            var oValidation = this._validateOrderForSubmission();
            if (!oValidation.valid) {
                MessageBox.error(oValidation.message);
                return;
            }

            var that = this;
            MessageBox.confirm(this._getText("poSubmitConfirm"), {
                onClose: function (sAction) {
                    if (sAction !== MessageBox.Action.OK) {
                        return;
                    }

                    var oModel = that.getView().getModel("purchaseOrders");
                    var sBasePath = "/purchaseOrders/" + that._iOrderIndex;
                    var oCurrentUser = that._getCurrentUserContext();
                    var oApprover = that._findProcurementManager();
                    var sSubmittedAt = that._nowString();

                    oModel.setProperty(sBasePath + "/approvalStatus", "SUBMITTED");
                    oModel.setProperty(sBasePath + "/approvalStatusText", that._getText("poApprovalSubmitted"));
                    oModel.setProperty(sBasePath + "/approvalStatusState", "Warning");
                    oModel.setProperty(sBasePath + "/submittedBy", oCurrentUser.username || "");
                    oModel.setProperty(sBasePath + "/submittedAt", sSubmittedAt);
                    oModel.setProperty(sBasePath + "/currentApprover", oApprover.username || "");
                    oModel.setProperty(sBasePath + "/currentApproverRole", oApprover.roleName || "");
                    oModel.setProperty(sBasePath + "/approvedBy", "");
                    oModel.setProperty(sBasePath + "/approvedAt", "");
                    oModel.setProperty(sBasePath + "/approvalComment", "");
                    if (!oModel.getProperty(sBasePath + "/processInstanceId")) {
                        oModel.setProperty(sBasePath + "/processInstanceId", "PI-PO-" + String(that._iOrderIndex + 1).padStart(3, "0"));
                    }
                    oModel.refresh(true);
                    that._refreshActionState();
                    MessageToast.show(that._getText("poSubmitSuccess"));
                }
            });
        },

        onApprove: function () {
            if (!this.getView().getModel("ui").getProperty("/canApprove")) {
                MessageToast.show(this._getText("poApproveNotAllowed"));
                return;
            }

            var that = this;
            MessageBox.confirm(this._getText("poApproveConfirm"), {
                onClose: function (sAction) {
                    if (sAction !== MessageBox.Action.OK) {
                        return;
                    }

                    that._applyApprovalDecision("APPROVED", that._getText("poApprovalApproved"), "Success");
                    MessageToast.show(that._getText("poApproveSuccess"));
                }
            });
        },

        onReject: function () {
            if (!this.getView().getModel("ui").getProperty("/canReject")) {
                MessageToast.show(this._getText("poRejectNotAllowed"));
                return;
            }

            var that = this;
            this._openRejectDialog(function (sComment) {
                MessageBox.confirm(that._getText("poRejectConfirm"), {
                    onClose: function (sAction) {
                        if (sAction !== MessageBox.Action.OK) {
                            return;
                        }

                        that._applyApprovalDecision("REJECTED", that._getText("poApprovalRejected"), "Error", sComment);
                        MessageToast.show(that._getText("poRejectSuccess"));
                    }
                });
            });
        },

        _openRejectDialog: function (fnConfirm) {
            var that = this;
            if (!this._oRejectDialog) {
                this._oRejectTextArea = new TextArea({
                    width: "100%",
                    rows: 4,
                    placeholder: this._getText("poRejectCommentPlaceholder")
                });

                this._oRejectDialog = new Dialog({
                    title: this._getText("poRejectCommentDialogTitle"),
                    contentWidth: "460px",
                    content: [
                        new Label({ text: this._getText("poApprovalComment") }),
                        this._oRejectTextArea
                    ],
                    beginButton: new Button({
                        text: this._getText("saveButton"),
                        type: "Emphasized",
                        press: function () {
                            var sComment = (that._oRejectTextArea.getValue() || "").trim();
                            if (!sComment) {
                                MessageToast.show(that._getText("poRejectCommentRequired"));
                                return;
                            }
                            that._oRejectDialog.close();
                            fnConfirm(sComment);
                        }
                    }),
                    endButton: new Button({
                        text: this._getText("cancelButton"),
                        press: function () {
                            that._oRejectDialog.close();
                        }
                    })
                });

                this.getView().addDependent(this._oRejectDialog);
            }

            this._oRejectTextArea.setValue("");
            this._oRejectDialog.open();
        },

        onDeleteItem: function (oEvent) {
            if (this._iOrderIndex === undefined || this._iOrderIndex < 0) {
                return;
            }

            var sPath = oEvent.getSource().getBindingContext("purchaseOrders").getPath();
            var iItemIndex = parseInt(sPath.split("/").pop(), 10);
            var oModel = this.getView().getModel("purchaseOrders");
            var aItems = oModel.getProperty("/purchaseOrders/" + this._iOrderIndex + "/items") || [];

            aItems.splice(iItemIndex, 1);
            if (!aItems.length) {
                aItems.push({
                    lineId: "10",
                    materialId: "",
                    materialName: "",
                    quantity: 1,
                    unit: "",
                    unitPrice: 0,
                    currency: "CNY",
                    amount: "0.00",
                    priceRecordId: "",
                    priceValidFrom: "",
                    priceValidTo: "",
                    priceMatched: false,
                    priceStatusText: "MISSING",
                    priceStatusState: "Error",
                    lowestPriceRecordId: "",
                    lowestMarketPrice: "0.00",
                    lowestMarketSupplierName: "",
                    priceBenchmarkText: this._getText("poNoComparablePrice"),
                    priceBenchmarkState: "None"
                });
            }

            oModel.setProperty("/purchaseOrders/" + this._iOrderIndex + "/items", aItems);
            this.onPricingConditionChange();
        },

        onCancel: function () {
            this.onNavBack();
        },

        _applyApprovalDecision: function (sStatus, sStatusText, sState, sApprovalComment) {
            var oModel = this.getView().getModel("purchaseOrders");
            var sBasePath = "/purchaseOrders/" + this._iOrderIndex;
            var oCurrentUser = this._getCurrentUserContext();

            oModel.setProperty(sBasePath + "/approvalStatus", sStatus);
            oModel.setProperty(sBasePath + "/approvalStatusText", sStatusText);
            oModel.setProperty(sBasePath + "/approvalStatusState", sState);
            oModel.setProperty(sBasePath + "/approvedBy", oCurrentUser.username || "");
            oModel.setProperty(sBasePath + "/approvedAt", this._nowString());
            oModel.setProperty(sBasePath + "/approvalComment", sApprovalComment || "");
            oModel.setProperty(sBasePath + "/currentApprover", "");
            oModel.setProperty(sBasePath + "/currentApproverRole", "");
            oModel.refresh(true);
            this._refreshActionState();
        },

        _validateOrderForSubmission: function () {
            var oModel = this.getView().getModel("purchaseOrders");
            var oOrder = oModel.getProperty("/purchaseOrders/" + this._iOrderIndex);
            var aItems = (oOrder && oOrder.items) || [];

            models.syncPurchaseOrderPricing(
                this.getOwnerComponent().getModel("purchaseOrders"),
                this.getOwnerComponent().getModel("priceLibrary"),
                this.getOwnerComponent().getModel("suppliers"),
                this.getOwnerComponent().getModel("materials")
            );

            if (!oOrder || !oOrder.supplierId || !oOrder.date || !oOrder.status) {
                return { valid: false, message: this._getText("purchaseOrderConditionRequired") };
            }
            if (!aItems.length) {
                return { valid: false, message: this._getText("purchaseOrderItemRequired") };
            }
            if (aItems.some(function (oItem) { return !oItem.materialId || !Number(oItem.quantity || 0); })) {
                return { valid: false, message: this._getText("purchaseOrderItemRequired") };
            }
            if (aItems.some(function (oItem) { return !oItem.priceMatched; })) {
                return { valid: false, message: this._getText("purchaseOrderPriceMissing") };
            }

            return { valid: true };
        },

        _refreshActionState: function () {
            var oUiModel = this.getView().getModel("ui");
            var oOrderModel = this.getView().getModel("purchaseOrders");
            var oOrder = this._iOrderIndex >= 0 ? oOrderModel.getProperty("/purchaseOrders/" + this._iOrderIndex) : null;
            var oCurrentUser = this._getCurrentUserContext();
            var bIsAdmin = oCurrentUser.roleId === "ROLE_ADMIN";
            var bIsCreator = !!oOrder && oOrder.createdBy === oCurrentUser.username;
            var bIsProcurementManager = oCurrentUser.roleId === "ROLE_PROCUREMENT_MANAGER";
            var bIsAssignedApprover = !!oOrder && oOrder.currentApprover === oCurrentUser.username;
            var sApprovalStatus = oOrder ? (oOrder.approvalStatus || "DRAFT") : "DRAFT";

            oUiModel.setData({
                canEditOrder: !!oOrder && (bIsAdmin || (bIsCreator && (sApprovalStatus === "DRAFT" || sApprovalStatus === "REJECTED"))),
                canSubmit: !!oOrder && (bIsAdmin || bIsCreator) && (sApprovalStatus === "DRAFT" || sApprovalStatus === "REJECTED"),
                canApprove: !!oOrder && sApprovalStatus === "SUBMITTED" && (bIsAdmin || (bIsProcurementManager && bIsAssignedApprover)),
                canReject: !!oOrder && sApprovalStatus === "SUBMITTED" && (bIsAdmin || (bIsProcurementManager && bIsAssignedApprover))
            });
        },

        _getCurrentUserContext: function () {
            var oUserModel = this.getOwnerComponent().getModel("user");
            var oUsersModel = this.getOwnerComponent().getModel("users");
            var oCurrentUser = oUserModel ? (oUserModel.getProperty("/currentUser") || {}) : {};
            var aRegisteredUsers = oUsersModel ? (oUsersModel.getProperty("/registeredUsers") || []) : [];
            var oRegisteredUser = aRegisteredUsers.find(function (oItem) {
                return oItem.username === oCurrentUser.username;
            }) || {};

            return {
                username: oCurrentUser.username || oRegisteredUser.username || "",
                roleId: oCurrentUser.roleId || oRegisteredUser.roleId || "",
                roleName: oCurrentUser.roleName || oRegisteredUser.roleName || oRegisteredUser.role || ""
            };
        },

        _findProcurementManager: function () {
            var aRegisteredUsers = this.getOwnerComponent().getModel("users").getProperty("/registeredUsers") || [];
            return aRegisteredUsers.find(function (oItem) {
                return oItem.roleId === "ROLE_PROCUREMENT_MANAGER" && oItem.status === "ACTIVE";
            }) || {};
        },

        _nowString: function () {
            var oNow = new Date();
            return oNow.getFullYear() + "-" + String(oNow.getMonth() + 1).padStart(2, "0") + "-" + String(oNow.getDate()).padStart(2, "0") +
                " " + String(oNow.getHours()).padStart(2, "0") + ":" + String(oNow.getMinutes()).padStart(2, "0");
        },

        onNavigateToMaterial: function (oEvent) {
            var sMaterialId = oEvent.getSource().getText();
            this.getOwnerComponent().getRouter().navTo("RouteMaterialDetail", {
                materialId: sMaterialId
            });
        },

        onNavigateToSupplier: function (oEvent) {
            var sSupplierId = oEvent.getSource().getText();
            this.getOwnerComponent().getRouter().navTo("RouteSupplierDetail", {
                supplierId: sSupplierId
            });
        },

        formatOrderStatusText: function (sStatus) {
            var mKey = {
                ORDERED: "statusOrderPlaced",
                PROCESSING: "statusProcessing",
                RECEIVED: "statusReceived",
                CANCELLED: "statusCancelled"
            };
            return this._getText(mKey[sStatus] || "status");
        },

        formatOrderStatusState: function (sStatus) {
            var mState = {
                ORDERED: "Information",
                PROCESSING: "Warning",
                RECEIVED: "Success",
                CANCELLED: "Error"
            };
            return mState[sStatus] || "None";
        },

        formatPriceMatchText: function (sStatus) {
            return this._getText(sStatus === "MATCHED" ? "priceMatched" : "priceMissing");
        },

        _getText: function (sKey) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey);
        }

    });
});