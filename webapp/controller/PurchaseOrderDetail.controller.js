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
                canReject: false,
                approvalProgressPercent: 0,
                approvalProgressState: "None",
                approvalProgressItems: []
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
                this._syncOrderProcessModelLink(this._iOrderIndex);
                this.getView().bindElement({
                    path: "/purchaseOrders/" + this._iOrderIndex,
                    model: "purchaseOrders"
                });
                this._refreshActionState();
            }
        },

        _resolveProcessModelForOrder: function (oOrder) {
            var aModels = this.getOwnerComponent().getModel("process").getProperty("/processModels") || [];
            if (!aModels.length) {
                return null;
            }

            if (oOrder && oOrder.processModelId) {
                var oById = aModels.find(function (oItem) {
                    return oItem.id === oOrder.processModelId;
                });
                if (oById) {
                    return oById;
                }
            }

            if (oOrder && oOrder.processModelName) {
                var oByName = aModels.find(function (oItem) {
                    return oItem.name === oOrder.processModelName;
                });
                if (oByName) {
                    return oByName;
                }
            }

            return aModels[0] || null;
        },

        _syncOrderProcessModelLink: function (iOrderIndex) {
            if (typeof iOrderIndex !== "number" || iOrderIndex < 0) {
                return;
            }

            var oModel = this.getView().getModel("purchaseOrders");
            var sOrderPath = "/purchaseOrders/" + iOrderIndex;
            var oOrder = oModel.getProperty(sOrderPath);
            if (!oOrder) {
                return;
            }

            var oLinkedModel = this._resolveProcessModelForOrder(oOrder);
            if (!oLinkedModel) {
                return;
            }

            oModel.setProperty(sOrderPath + "/processModelId", oLinkedModel.id);
            oModel.setProperty(sOrderPath + "/processModelName", oLinkedModel.name);
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
                    that._syncOrderProcessModelLink(that._iOrderIndex);
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

            var oProgressData = this._buildApprovalProgressData(oOrder);
            oUiModel.setProperty("/approvalProgressPercent", oProgressData.percent);
            oUiModel.setProperty("/approvalProgressState", oProgressData.state);
            oUiModel.setProperty("/approvalProgressItems", oProgressData.items);
        },

        _buildApprovalProgressData: function (oOrder) {
            if (!oOrder) {
                return {
                    percent: 0,
                    state: "None",
                    items: []
                };
            }

            var sStatus = oOrder.approvalStatus || "DRAFT";
            var aStepStatesByStatus = {
                DRAFT: ["Success", "Warning", "None", "None"],
                SUBMITTED: ["Success", "Success", "Warning", "None"],
                APPROVED: ["Success", "Success", "Success", "Success"],
                REJECTED: ["Success", "Success", "Error", "Error"]
            };
            var mProgressByStatus = {
                DRAFT: { percent: 25, state: "Information" },
                SUBMITTED: { percent: 70, state: "Warning" },
                APPROVED: { percent: 100, state: "Success" },
                REJECTED: { percent: 100, state: "Error" }
            };
            var aStates = aStepStatesByStatus[sStatus] || aStepStatesByStatus.DRAFT;
            var oProgress = mProgressByStatus[sStatus] || mProgressByStatus.DRAFT;
            var sCreatorText = ((oOrder.createdBy || "-") + " / " + (oOrder.creatorRole || "-")).replace(/\s+$/, "");
            var sSubmitter = oOrder.submittedBy || "-";
            var sApprover = sStatus === "SUBMITTED"
                ? ((oOrder.currentApprover || "-") + " / " + (oOrder.currentApproverRole || "-")).replace(/\s+$/, "")
                : (oOrder.approvedBy || "-");
            var sFinishText = sStatus === "APPROVED"
                ? this._getText("poProgressResultApproved")
                : (sStatus === "REJECTED" ? this._getText("poProgressResultRejected") : this._getText("poProgressResultPending"));

            return {
                percent: oProgress.percent,
                state: oProgress.state,
                items: [
                    {
                        title: this._getText("poProgressStepCreate"),
                        detail: sCreatorText,
                        time: oOrder.date || "-",
                        state: aStates[0],
                        icon: "sap-icon://employee"
                    },
                    {
                        title: this._getText("poProgressStepSubmit"),
                        detail: sSubmitter,
                        time: oOrder.submittedAt || "-",
                        state: aStates[1],
                        icon: "sap-icon://paper-plane"
                    },
                    {
                        title: this._getText("poProgressStepApprove"),
                        detail: sApprover,
                        time: oOrder.approvedAt || "-",
                        state: aStates[2],
                        icon: "sap-icon://task"
                    },
                    {
                        title: this._getText("poProgressStepFinish"),
                        detail: sFinishText,
                        time: oOrder.approvedAt || "-",
                        state: aStates[3],
                        icon: "sap-icon://complete"
                    }
                ]
            };
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