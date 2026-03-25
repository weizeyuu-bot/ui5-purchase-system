sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
], function (Controller, Filter, FilterOperator, JSONModel, MessageBox) {
    "use strict";

    return Controller.extend("myapp.controller.InvoiceList", {

        onInit: function () {
            this._oNewInvoice = {};
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteHome");
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("query");
            var oTable = this.getView().byId("invoiceTable");
            var oBinding = oTable.getBinding("items");

            if (sQuery) {
                var aFilters = [
                    new Filter("id", FilterOperator.Contains, sQuery),
                    new Filter("status", FilterOperator.Contains, sQuery),
                    new Filter("purchaseOrderId", FilterOperator.Contains, sQuery),
                    new Filter("deliveryPlanId", FilterOperator.Contains, sQuery)
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
            var sPath = oEvent.getSource().getBindingContext("invoices").getPath();
            var sInvoiceId = this.getView().getModel("invoices").getProperty(sPath + "/id");
            this.getOwnerComponent().getRouter().navTo("RouteInvoiceDetail", {
                invoiceId: sInvoiceId
            });
        },

        onViewPress: function (oEvent) {
            var oButton = oEvent.getSource();
            var oItem = oButton.getParent().getParent();
            var sPath = oItem.getBindingContext("invoices").getPath();
            var sInvoiceId = this.getView().getModel("invoices").getProperty(sPath + "/id");
            this.getOwnerComponent().getRouter().navTo("RouteInvoiceDetail", {
                invoiceId: sInvoiceId
            });
        },

        onEditPress: function (oEvent) {
            var oButton = oEvent.getSource();
            var oItem = oButton.getParent().getParent();
            var sPath = oItem.getBindingContext("invoices").getPath();
            var oInvoice = this.getView().getModel("invoices").getProperty(sPath);
            this._oNewInvoice = this._createDraftFromInvoice(oInvoice);
            var oModel = new JSONModel(this._oNewInvoice);
            this.getView().setModel(oModel, "oNewInvoice");
            this._bIsEdit = true;
            this._iEditIndex = parseInt(sPath.split("/").pop(), 10);
            this.getView().byId("invoiceDialog").open();
        },

        onAdd: function () {
            this._oNewInvoice = this._createEmptyDraft();
            var oModel = new JSONModel(this._oNewInvoice);
            this.getView().setModel(oModel, "oNewInvoice");
            this._bIsEdit = false;
            this.getView().byId("invoiceDialog").open();
        },

        onAddDraftItem: function () {
            var oDraftModel = this.getView().getModel("oNewInvoice");
            if (!oDraftModel) {
                return;
            }

            var oDraft = oDraftModel.getData();
            var aItems = oDraft.items || [];
            aItems.push(this._createEmptyItem(this._buildLineId(aItems.length)));
            oDraft.items = aItems;
            this._syncDraftSummary(oDraft);
            oDraftModel.refresh(true);
        },

        onDeleteDraftItem: function (oEvent) {
            var oDraftModel = this.getView().getModel("oNewInvoice");
            if (!oDraftModel) {
                return;
            }

            var sPath = oEvent.getSource().getBindingContext("oNewInvoice").getPath();
            var iItemIndex = parseInt(sPath.split("/").pop(), 10);
            var oDraft = oDraftModel.getData();
            var aItems = oDraft.items || [];

            aItems.splice(iItemIndex, 1);
            if (!aItems.length) {
                aItems.push(this._createEmptyItem("10"));
            }

            aItems.forEach(function (oLine, iIndex) {
                oLine.lineId = this._buildLineId(iIndex);
            }, this);
            oDraft.items = aItems;
            this._syncDraftSummary(oDraft);
            oDraftModel.refresh(true);
        },

        onDraftItemChange: function () {
            var oDraftModel = this.getView().getModel("oNewInvoice");
            if (!oDraftModel) {
                return;
            }
            var oDraft = oDraftModel.getData();
            this._alignDraftItems(oDraft);
            this._syncDraftSummary(oDraft);
            oDraftModel.refresh(true);
        },

        onDialogSave: function () {
            // 验证必填项
            var sInvoiceNumber = this.getView().byId("invNumberInput").getValue().trim();
            var aItems = this._oNewInvoice.items || [];

            if (!sInvoiceNumber) {
                MessageBox.error(this._getText("invoiceIdRequired"));
                return;
            }

            if (!aItems.length || aItems.some(function (oLine) {
                return !oLine.purchaseOrderId || !oLine.deliveryPlanId || !Number(oLine.amount || 0);
            })) {
                MessageBox.error(this._getText("invoiceItemRequired"));
                return;
            }

            if (aItems.some(function (oLine) {
                return !this._isDeliveryPlanLinkedToPurchaseOrder(oLine.deliveryPlanId, oLine.purchaseOrderId);
            }, this)) {
                MessageBox.error(this._getText("invoiceItemRelationInvalid"));
                return;
            }

            if (!this._oNewInvoice.status) {
                MessageBox.error(this._getText("statusRequired"));
                return;
            }

            this._oNewInvoice.id = sInvoiceNumber;
            this._oNewInvoice.items = aItems.map(function (oLine, iIndex) {
                return {
                    lineId: this._buildLineId(iIndex),
                    purchaseOrderId: oLine.purchaseOrderId,
                    deliveryPlanId: oLine.deliveryPlanId,
                    amount: Number(oLine.amount || 0)
                };
            }, this);
            this._syncDraftSummary(this._oNewInvoice);

            var oInvoiceModel = this.getView().getModel("invoices");
            var aInvoices = oInvoiceModel.getProperty("/invoices");

            if (this._bIsEdit) {
                aInvoices[this._iEditIndex] = this._oNewInvoice;
            } else {
                aInvoices.unshift(this._oNewInvoice);
            }

            oInvoiceModel.setProperty("/invoices", aInvoices);
            this.getView().byId("invoiceDialog").close();
        },

        onDialogCancel: function () {
            this.getView().byId("invoiceDialog").close();
        },

        onDeletePress: function (oEvent) {
            var oButton = oEvent.getSource();
            var oItem = oButton.getParent().getParent();
            var sPath = oItem.getBindingContext("invoices").getPath();
            var oModel = this.getView().getModel("invoices");
            var aInvoices = oModel.getProperty("/invoices");
            var iIndex = parseInt(sPath.split("/").pop(), 10);
            aInvoices.splice(iIndex, 1);
            oModel.setProperty("/invoices", aInvoices);
        },

        onNavigateToPurchaseOrder: function (oEvent) {
            var sPO = oEvent.getSource().getText();
            this.getOwnerComponent().getRouter().navTo("RoutePurchaseOrderDetail", {
                orderId: sPO
            });
        },

        onNavigateToDeliveryPlan: function (oEvent) {
            var sDP = oEvent.getSource().getText();
            this.getOwnerComponent().getRouter().navTo("RouteDeliveryPlanDetail", {
                planId: sDP
            });
        },

        formatInvoiceStatusText: function (sStatus) {
            var mKey = {
                PENDING: "invoiceStatusPending",
                INVOICED: "invoiceStatusInvoiced",
                VOID: "invoiceStatusVoided"
            };
            return this._getText(mKey[sStatus] || "status");
        },

        _createDraftFromInvoice: function (oInvoice) {
            var oDraft = JSON.parse(JSON.stringify(oInvoice || {}));
            var aItems = Array.isArray(oDraft.items) ? oDraft.items : [];
            if (!aItems.length) {
                aItems.push(this._createEmptyItem("10"));
            }
            oDraft.invoiceNumber = oDraft.id || "";
            oDraft.date = oDraft.date || this._todayString();
            oDraft.status = oDraft.status || "";
            oDraft.items = aItems;
            oDraft.purchaseOrderOptions = this._buildPurchaseOrderOptions();
            oDraft.deliveryPlanOptions = this._buildDeliveryPlanOptions();
            this._syncDraftSummary(oDraft);
            return oDraft;
        },

        _createEmptyDraft: function () {
            var oDraft = {
                id: "",
                invoiceNumber: "",
                date: this._todayString(),
                status: "",
                purchaseOrderId: "",
                deliveryPlanId: "",
                amount: "0.00",
                itemCount: 1,
                purchaseOrderOptions: this._buildPurchaseOrderOptions(),
                deliveryPlanOptions: this._buildDeliveryPlanOptions(),
                items: [this._createEmptyItem("10")]
            };
            this._syncDraftSummary(oDraft);
            return oDraft;
        },

        _createEmptyItem: function (sLineId) {
            return {
                lineId: sLineId,
                purchaseOrderId: "",
                deliveryPlanId: "",
                amount: 0
            };
        },

        _buildLineId: function (iIndex) {
            return String((iIndex + 1) * 10);
        },

        _syncDraftSummary: function (oDraft) {
            var aItems = oDraft.items || [];
            var fTotalAmount = aItems.reduce(function (fSum, oLine) {
                return fSum + Number(oLine.amount || 0);
            }, 0);

            oDraft.itemCount = aItems.length;
            oDraft.amount = fTotalAmount.toFixed(2);
            oDraft.purchaseOrderId = aItems.length ? (aItems[0].purchaseOrderId || "") : "";
            oDraft.deliveryPlanId = aItems.length ? (aItems[0].deliveryPlanId || "") : "";
        },

        _alignDraftItems: function (oDraft) {
            var aItems = oDraft.items || [];
            aItems.forEach(function (oLine) {
                oLine.amount = Number(oLine.amount || 0);
                if (!oLine.purchaseOrderId) {
                    oLine.deliveryPlanId = "";
                    return;
                }

                if (!this._isDeliveryPlanLinkedToPurchaseOrder(oLine.deliveryPlanId, oLine.purchaseOrderId)) {
                    oLine.deliveryPlanId = this._getFirstDeliveryPlanIdByPurchaseOrder(oLine.purchaseOrderId);
                }
            }, this);
        },

        _isDeliveryPlanLinkedToPurchaseOrder: function (sDeliveryPlanId, sPurchaseOrderId) {
            if (!sDeliveryPlanId || !sPurchaseOrderId) {
                return false;
            }

            var aPlans = this.getOwnerComponent().getModel("deliveryPlans").getProperty("/deliveryPlans") || [];
            return aPlans.some(function (oPlan) {
                return oPlan.id === sDeliveryPlanId && oPlan.purchaseOrderId === sPurchaseOrderId;
            });
        },

        _getFirstDeliveryPlanIdByPurchaseOrder: function (sPurchaseOrderId) {
            if (!sPurchaseOrderId) {
                return "";
            }

            var aPlans = this.getOwnerComponent().getModel("deliveryPlans").getProperty("/deliveryPlans") || [];
            var oMatched = aPlans.find(function (oPlan) {
                return oPlan.purchaseOrderId === sPurchaseOrderId;
            });
            return oMatched ? oMatched.id : "";
        },

        _todayString: function () {
            return new Date().toISOString().slice(0, 10);
        },

        _buildPurchaseOrderOptions: function () {
            var aOrders = this.getOwnerComponent().getModel("purchaseOrders").getProperty("/purchaseOrders") || [];
            return [{ id: "", name: this._getText("pleaseSelect") }].concat(aOrders.map(function (oOrder) {
                return {
                    id: oOrder.id,
                    name: oOrder.id + " - " + (oOrder.vendor || "")
                };
            }));
        },

        _buildDeliveryPlanOptions: function () {
            var aPlans = this.getOwnerComponent().getModel("deliveryPlans").getProperty("/deliveryPlans") || [];
            return [{ id: "", name: this._getText("pleaseSelect") }].concat(aPlans.map(function (oPlan) {
                return {
                    id: oPlan.id,
                    name: oPlan.id + " - " + (oPlan.purchaseOrderId || "")
                };
            }));
        },

        _getText: function (sKey) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey);
        }
    });
});