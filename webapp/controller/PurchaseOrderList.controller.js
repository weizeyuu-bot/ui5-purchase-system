sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/TextArea",
    "sap/m/Label",
    "myapp/model/models"
], function (Controller, Filter, FilterOperator, JSONModel, MessageToast, MessageBox, Dialog, Button, TextArea, Label, models) {
    "use strict";

    return Controller.extend("myapp.controller.PurchaseOrderList", {

        onInit: function () {
            this._oNewPO = {};
            this._oRejectDialog = null;
            this._oRejectTextArea = null;
            this.getView().setModel(this.getOwnerComponent().getModel("purchaseOrders"), "purchaseOrders");
            models.syncPurchaseOrderPricing(
                this.getOwnerComponent().getModel("purchaseOrders"),
                this.getOwnerComponent().getModel("priceLibrary"),
                this.getOwnerComponent().getModel("suppliers"),
                this.getOwnerComponent().getModel("materials")
            );
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteHome");
        },

        onSearch: function (oEvent) {
            var sQuery = (oEvent.getParameter("query") || oEvent.getParameter("newValue") || "").trim();
            var oTable = this.getView().byId("poTable");
            var oBinding = oTable.getBinding("items");

            if (sQuery) {
                var aFilters = [
                    new Filter("id", FilterOperator.Contains, sQuery),
                    new Filter("vendor", FilterOperator.Contains, sQuery),
                    new Filter("materialSummary", FilterOperator.Contains, sQuery),
                    new Filter("supplierId", FilterOperator.Contains, sQuery)
                ];
                var oFilter = new Filter({
                    filters: aFilters,
                    and: false
                });
                oBinding.filter(oFilter);
            } else {
                oBinding.filter([]);
            }
        },

        onItemPress: function (oEvent) {
            var sPath = oEvent.getSource().getBindingContext("purchaseOrders").getPath();
            var sOrderId = this.getView().getModel("purchaseOrders").getProperty(sPath + "/id");
            this.getOwnerComponent().getRouter().navTo("RoutePurchaseOrderDetail", {
                orderId: sOrderId
            });
        },

        onViewPress: function (oEvent) {
            var oButton = oEvent.getSource();
            var oItem = oButton.getParent().getParent();
            var sPath = oItem.getBindingContext("purchaseOrders").getPath();
            var sOrderId = this.getView().getModel("purchaseOrders").getProperty(sPath + "/id");
            this._navToOrderDetail(sOrderId);
        },

        onEditPress: function (oEvent) {
            var oButton = oEvent.getSource();
            var oItem = oButton.getParent().getParent();
            var sPath = oItem.getBindingContext("purchaseOrders").getPath();
            var sOrderId = this.getView().getModel("purchaseOrders").getProperty(sPath + "/id");
            this._navToOrderDetail(sOrderId);
        },

        onQuickSubmitApproval: function (oEvent) {
            var oOrder = this._getOrderFromEvent(oEvent);
            var sPath = this._getOrderPathFromEvent(oEvent);
            if (!oOrder || !sPath) {
                return;
            }

            if (!this.isQuickSubmitVisible(oOrder.approvalStatus, oOrder.createdBy)) {
                MessageToast.show(this._getText("poQuickActionDenied"));
                return;
            }

            var oValidation = this._validateOrderForSubmission(oOrder);
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
                    var oCurrentUser = that._getCurrentUserContext();
                    var oApprover = that._findProcurementManager();

                    oModel.setProperty(sPath + "/approvalStatus", "SUBMITTED");
                    oModel.setProperty(sPath + "/approvalStatusText", that._getText("poApprovalSubmitted"));
                    oModel.setProperty(sPath + "/approvalStatusState", "Warning");
                    oModel.setProperty(sPath + "/submittedBy", oCurrentUser.username || "");
                    oModel.setProperty(sPath + "/submittedAt", that._nowString());
                    oModel.setProperty(sPath + "/currentApprover", oApprover.username || "");
                    oModel.setProperty(sPath + "/currentApproverRole", oApprover.roleName || "");
                    oModel.setProperty(sPath + "/approvedBy", "");
                    oModel.setProperty(sPath + "/approvedAt", "");
                    oModel.setProperty(sPath + "/approvalComment", "");
                    if (!oModel.getProperty(sPath + "/processInstanceId")) {
                        oModel.setProperty(sPath + "/processInstanceId", "PI-PO-" + String(that._pathToIndex(sPath) + 1).padStart(3, "0"));
                    }
                    oModel.refresh(true);
                    MessageToast.show(that._getText("poSubmitSuccess"));
                }
            });
        },

        onQuickApprove: function (oEvent) {
            var oOrder = this._getOrderFromEvent(oEvent);
            var sPath = this._getOrderPathFromEvent(oEvent);
            if (!oOrder || !sPath) {
                return;
            }

            if (!this.isQuickApproveVisible(oOrder.approvalStatus, oOrder.currentApprover)) {
                MessageToast.show(this._getText("poQuickActionDenied"));
                return;
            }

            var that = this;
            MessageBox.confirm(this._getText("poApproveConfirm"), {
                onClose: function (sAction) {
                    if (sAction !== MessageBox.Action.OK) {
                        return;
                    }

                    that._applyQuickDecision(sPath, "APPROVED", that._getText("poApprovalApproved"), "Success", "");
                    MessageToast.show(that._getText("poApproveSuccess"));
                }
            });
        },

        onQuickReject: function (oEvent) {
            var oOrder = this._getOrderFromEvent(oEvent);
            var sPath = this._getOrderPathFromEvent(oEvent);
            if (!oOrder || !sPath) {
                return;
            }

            if (!this.isQuickRejectVisible(oOrder.approvalStatus, oOrder.currentApprover)) {
                MessageToast.show(this._getText("poQuickActionDenied"));
                return;
            }

            var that = this;
            this._openRejectDialog(function (sComment) {
                MessageBox.confirm(that._getText("poRejectConfirm"), {
                    onClose: function (sAction) {
                        if (sAction !== MessageBox.Action.OK) {
                            return;
                        }

                        that._applyQuickDecision(sPath, "REJECTED", that._getText("poApprovalRejected"), "Error", sComment);
                        MessageToast.show(that._getText("poRejectSuccess"));
                    }
                });
            });
        },

        onAdd: function () {
            this._oNewPO = this._createEmptyOrderDraft();
            var oModel = new JSONModel(this._oNewPO);
            this.getView().setModel(oModel, "oNewPO");
            this._bIsEdit = false;
            this._syncDraftPrice();
            this.getView().byId("poDialog").open();
        },

        onPricingConditionChange: function () {
            this._syncDraftPrice();
        },

        onDialogSave: function () {
            var sOrderNumber = this.getView().byId("poNumberInput").getValue().trim();
            var aDraftItems = this._oNewPO.items || [];

            if (!sOrderNumber) {
                MessageBox.error(this._getText("purchaseOrderIdRequired"));
                return;
            }

            if (!this._oNewPO.supplierId || !this._oNewPO.date || !aDraftItems.length) {
                MessageBox.error(this._getText("purchaseOrderConditionRequired"));
                return;
            }

            if (!this._oNewPO.status) {
                MessageBox.error(this._getText("statusRequired"));
                return;
            }

            if (aDraftItems.some(function (oItem) {
                return !oItem.materialId || !Number(oItem.quantity || 0);
            })) {
                MessageBox.error(this._getText("purchaseOrderItemRequired"));
                return;
            }

            if (aDraftItems.some(function (oItem) {
                return !oItem.priceMatched;
            })) {
                MessageBox.error(this._getText("purchaseOrderPriceMissing"));
                return;
            }

            var oOrderModel = this.getView().getModel("purchaseOrders");
            var aOrders = oOrderModel.getProperty("/purchaseOrders");
            var oCurrentUser = this._getCurrentUserContext();

            this._oNewPO.id = sOrderNumber;
            this._oNewPO.createdBy = oCurrentUser.username || "";
            this._oNewPO.creatorRole = oCurrentUser.roleName || "";
            this._oNewPO.approvalStatus = this._oNewPO.approvalStatus || "DRAFT";
            this._oNewPO.approvalStatusText = this._oNewPO.approvalStatusText || this._getText("poApprovalDraft");
            this._oNewPO.approvalStatusState = this._oNewPO.approvalStatusState || "Information";
            this._oNewPO.submittedBy = this._oNewPO.submittedBy || "";
            this._oNewPO.submittedAt = this._oNewPO.submittedAt || "";
            this._oNewPO.currentApprover = this._oNewPO.currentApprover || "";
            this._oNewPO.currentApproverRole = this._oNewPO.currentApproverRole || "";
            this._oNewPO.approvedBy = this._oNewPO.approvedBy || "";
            this._oNewPO.approvedAt = this._oNewPO.approvedAt || "";
            this._oNewPO.processModelName = this._oNewPO.processModelName || this._getText("poDefaultProcessModelName");
            this._oNewPO.processInstanceId = this._oNewPO.processInstanceId || "";
            this._oNewPO.items = aDraftItems.map(function (oItem, iIndex) {
                return Object.assign({}, oItem, {
                    lineId: oItem.lineId || this._buildLineId(iIndex),
                    quantity: Number(oItem.quantity || 0)
                });
            }, this);
            aOrders.unshift(this._oNewPO);

            oOrderModel.setProperty("/purchaseOrders", aOrders);
            models.syncPurchaseOrderPricing(
                oOrderModel,
                this.getOwnerComponent().getModel("priceLibrary"),
                this.getOwnerComponent().getModel("suppliers"),
                this.getOwnerComponent().getModel("materials")
            );
            this.getView().byId("poDialog").close();
        },

        onDialogCancel: function () {
            this.getView().byId("poDialog").close();
        },

        onAddDraftItem: function () {
            var oDraftModel = this.getView().getModel("oNewPO");
            if (!oDraftModel) {
                return;
            }

            var oDraft = oDraftModel.getData();
            var aItems = oDraft.items || [];
            aItems.push(this._createEmptyOrderItem(this._buildLineId(aItems.length)));
            oDraft.items = aItems;
            this._syncDraftPrice();
        },

        onDeleteDraftItem: function (oEvent) {
            var oDraftModel = this.getView().getModel("oNewPO");
            if (!oDraftModel) {
                return;
            }

            var sPath = oEvent.getSource().getBindingContext("oNewPO").getPath();
            var iItemIndex = parseInt(sPath.split("/").pop(), 10);
            var oDraft = oDraftModel.getData();
            var aItems = oDraft.items || [];

            aItems.splice(iItemIndex, 1);
            if (!aItems.length) {
                aItems.push(this._createEmptyOrderItem("10"));
            }

            aItems.forEach(function (oItem, iIndex) {
                oItem.lineId = this._buildLineId(iIndex);
            }, this);
            oDraft.items = aItems;
            this._syncDraftPrice();
        },

        onDeletePress: function (oEvent) {
            var oButton = oEvent.getSource();
            var oItem = oButton.getParent().getParent();
            var sPath = oItem.getBindingContext("purchaseOrders").getPath();
            var oModel = this.getView().getModel("purchaseOrders");
            var aOrders = oModel.getProperty("/purchaseOrders");
            var iIndex = parseInt(sPath.split("/").pop(), 10);
            aOrders.splice(iIndex, 1);
            oModel.setProperty("/purchaseOrders", aOrders);
        },

        isQuickSubmitVisible: function (sApprovalStatus, sCreatedBy) {
            var oCurrentUser = this._getCurrentUserContext();
            var bIsAdmin = oCurrentUser.roleId === "ROLE_ADMIN";
            var bIsCreator = sCreatedBy === oCurrentUser.username;
            return (bIsAdmin || bIsCreator) && (sApprovalStatus === "DRAFT" || sApprovalStatus === "REJECTED");
        },

        isQuickApproveVisible: function (sApprovalStatus, sCurrentApprover) {
            var oCurrentUser = this._getCurrentUserContext();
            var bIsAdmin = oCurrentUser.roleId === "ROLE_ADMIN";
            var bIsProcurementManager = oCurrentUser.roleId === "ROLE_PROCUREMENT_MANAGER";
            var bIsAssigned = sCurrentApprover === oCurrentUser.username;
            return sApprovalStatus === "SUBMITTED" && (bIsAdmin || (bIsProcurementManager && bIsAssigned));
        },

        isQuickRejectVisible: function (sApprovalStatus, sCurrentApprover) {
            return this.isQuickApproveVisible(sApprovalStatus, sCurrentApprover);
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

        _applyQuickDecision: function (sPath, sStatus, sStatusText, sState, sApprovalComment) {
            var oModel = this.getView().getModel("purchaseOrders");
            var oCurrentUser = this._getCurrentUserContext();

            oModel.setProperty(sPath + "/approvalStatus", sStatus);
            oModel.setProperty(sPath + "/approvalStatusText", sStatusText);
            oModel.setProperty(sPath + "/approvalStatusState", sState);
            oModel.setProperty(sPath + "/approvedBy", oCurrentUser.username || "");
            oModel.setProperty(sPath + "/approvedAt", this._nowString());
            oModel.setProperty(sPath + "/approvalComment", sApprovalComment || "");
            oModel.setProperty(sPath + "/currentApprover", "");
            oModel.setProperty(sPath + "/currentApproverRole", "");
            oModel.refresh(true);
        },

        _validateOrderForSubmission: function (oOrder) {
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

        _getOrderFromEvent: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("purchaseOrders");
            return oContext ? oContext.getObject() : null;
        },

        _getOrderPathFromEvent: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("purchaseOrders");
            return oContext ? oContext.getPath() : "";
        },

        _pathToIndex: function (sPath) {
            var sLast = (sPath || "").split("/").pop();
            return parseInt(sLast, 10) || 0;
        },

        _syncDraftPrice: function () {
            var oDraftModel = this.getView().getModel("oNewPO");
            if (!oDraftModel) {
                return;
            }

            var oDraft = oDraftModel.getData();
            var aItems = oDraft.items || [];
            if (!aItems.length) {
                return;
            }

            var aPriceRecords = this.getOwnerComponent().getModel("priceLibrary").getProperty("/priceRecords");
            var aSuppliers = this.getOwnerComponent().getModel("suppliers").getProperty("/suppliers") || [];
            var aMaterials = this.getOwnerComponent().getModel("materials").getProperty("/materials") || [];
            var oSupplier = aSuppliers.find(function (oItem) { return oItem.id === oDraft.supplierId; });
            var fTotalAmount = 0;
            var iTotalQuantity = 0;
            var aMaterialNames = [];
            var bAllMatched = true;
            var sCurrency = "CNY";

            oDraft.vendor = oSupplier ? oSupplier.name : "";

            aItems.forEach(function (oItem, iIndex) {
                var oMaterial = aMaterials.find(function (oMaterialItem) {
                    return oMaterialItem.id === oItem.materialId;
                });
                var oPrice = models.findEffectivePriceRecord(
                    aPriceRecords,
                    oDraft.supplierId,
                    oItem.materialId,
                    oDraft.date
                );
                var oLowestPrice = models.findLowestPriceRecordForMaterial(
                    aPriceRecords,
                    oItem.materialId,
                    oDraft.date
                );
                var iQuantity = Number(oItem.quantity || 0);

                oItem.lineId = this._buildLineId(iIndex);
                oItem.materialName = oMaterial ? oMaterial.name : "";
                oItem.unit = oMaterial ? oMaterial.unit : "";
                oItem.priceMatched = !!oPrice;
                oItem.unitPrice = oPrice ? Number(oPrice.unitPrice) : 0;
                oItem.currency = oPrice ? oPrice.currency : "CNY";
                oItem.priceRecordId = oPrice ? oPrice.id : "";
                oItem.priceValidFrom = oPrice ? oPrice.validFrom : "";
                oItem.priceValidTo = oPrice ? oPrice.validTo : "";
                oItem.priceRemark = oPrice ? oPrice.remark : this._getText("poPriceMissing");
                oItem.priceStatusText = oPrice ? "MATCHED" : "MISSING";
                oItem.priceStatusState = oPrice ? "Success" : "Error";
                oItem.amount = oPrice ? (iQuantity * Number(oPrice.unitPrice)).toFixed(2) : "0.00";
                oItem.lowestPriceRecordId = oLowestPrice ? oLowestPrice.id : "";
                oItem.lowestMarketPrice = oLowestPrice ? Number(oLowestPrice.unitPrice).toFixed(2) : "0.00";
                oItem.lowestMarketSupplierName = oLowestPrice ? oLowestPrice.supplierName : "";

                if (!oPrice || !oLowestPrice) {
                    oItem.priceBenchmarkText = this._getText("poNoComparablePrice");
                    oItem.priceBenchmarkState = "None";
                } else if (Number(oPrice.unitPrice) === Number(oLowestPrice.unitPrice)) {
                    oItem.priceBenchmarkText = this._getText("poAtLowestPrice");
                    oItem.priceBenchmarkState = "Success";
                } else {
                    oItem.priceBenchmarkText = this._getText("poHigherThanLowestPrice", [(Number(oPrice.unitPrice) - Number(oLowestPrice.unitPrice)).toFixed(2)]);
                    oItem.priceBenchmarkState = "Warning";
                }

                fTotalAmount += Number(oItem.amount || 0);
                iTotalQuantity += iQuantity;
                bAllMatched = bAllMatched && !!oItem.priceMatched;
                sCurrency = oItem.currency || sCurrency;
                if (oItem.materialName) {
                    aMaterialNames.push(oItem.materialName);
                }
            }, this);

            oDraft.itemCount = aItems.length;
            oDraft.totalQuantity = iTotalQuantity;
            oDraft.currency = sCurrency;
            oDraft.amount = fTotalAmount.toFixed(2);
            oDraft.materialSummary = aMaterialNames.join(" / ");
            oDraft.priceMatched = bAllMatched;

            oDraftModel.refresh(true);
        },

        _createEmptyOrderDraft: function () {
            var aSuppliers = this.getOwnerComponent().getModel("suppliers").getProperty("/suppliers") || [];
            var aMaterials = this.getOwnerComponent().getModel("materials").getProperty("/materials") || [];
            return {
                id: "",
                supplierId: "",
                vendor: "",
                date: this._todayString(),
                status: "",
                currency: "CNY",
                amount: "0.00",
                itemCount: 1,
                totalQuantity: 0,
                supplierOptions: [{ id: "", name: this._getText("pleaseSelect") }].concat(aSuppliers),
                materialOptions: [{ id: "", name: this._getText("pleaseSelect") }].concat(aMaterials),
                approvalStatus: "DRAFT",
                approvalStatusText: this._getText("poApprovalDraft"),
                approvalStatusState: "Information",
                processModelName: this._getText("poDefaultProcessModelName"),
                createdBy: this._getCurrentUserContext().username || "",
                creatorRole: this._getCurrentUserContext().roleName || "",
                submittedBy: "",
                submittedAt: "",
                currentApprover: "",
                currentApproverRole: "",
                approvedBy: "",
                approvedAt: "",
                items: [
                    this._createEmptyOrderItem("10")
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

        _createEmptyOrderItem: function (sLineId) {
            return {
                lineId: sLineId,
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
                priceBenchmarkText: "",
                priceBenchmarkState: "None",
                lowestMarketPrice: "0.00",
                lowestMarketSupplierName: ""
            };
        },

        _buildLineId: function (iIndex) {
            return String((iIndex + 1) * 10);
        },

        _navToOrderDetail: function (sOrderId) {
            this.getOwnerComponent().getRouter().navTo("RoutePurchaseOrderDetail", {
                orderId: sOrderId
            });
        },

        _todayString: function () {
            return new Date().toISOString().slice(0, 10);
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

        formatPriceMatchText: function (sStatus) {
            return this._getText(sStatus === "MATCHED" ? "priceMatched" : "priceMissing");
        },

        _getText: function (sKey, aArgs) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey, aArgs);
        }
    });
});