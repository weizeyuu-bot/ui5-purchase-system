sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel"
], function (Controller, History, MessageToast, JSONModel) {
    "use strict";

    return Controller.extend("myapp.controller.InvoiceDetail", {

        onInit: function () {
            this.getView().setModel(new JSONModel({
                purchaseOrderOptions: [{ id: "", name: this._getText("pleaseSelect") }].concat((this.getOwnerComponent().getModel("purchaseOrders").getProperty("/purchaseOrders") || []).map(function (oOrder) {
                    return {
                        id: oOrder.id,
                        name: oOrder.id + " - " + (oOrder.vendor || "")
                    };
                })),
                deliveryPlanOptions: [{ id: "", name: this._getText("pleaseSelect") }].concat((this.getOwnerComponent().getModel("deliveryPlans").getProperty("/deliveryPlans") || []).map(function (oPlan) {
                    return {
                        id: oPlan.id,
                        name: oPlan.id + " - " + (oPlan.purchaseOrderId || "")
                    };
                }))
            }), "selectOptions");

            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteInvoiceDetail").attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: function (oEvent) {
            var sInvoiceId = oEvent.getParameter("arguments").invoiceId;
            var oModel = this.getView().getModel("invoices");
            var aInvoices = oModel.getProperty("/invoices");
            var oInvoice = aInvoices.find(function (item) {
                return item.id === sInvoiceId;
            });
            if (oInvoice) {
                this._iInvoiceIndex = aInvoices.indexOf(oInvoice);
                this._normalizeInvoiceStructure(oInvoice);
                this.getView().bindElement({
                    path: "/invoices/" + this._iInvoiceIndex,
                    model: "invoices"
                });
            }
        },

        onNavBack: function () {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("RouteInvoiceList", {}, true);
            }
        },

        onSave: function () {
            this._syncCurrentInvoice();
            MessageToast.show(this._getText("invoiceSaved"));
            this.onNavBack();
        },

        onCancel: function () {
            this.onNavBack();
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

        onAddItem: function () {
            if (this._iInvoiceIndex === undefined || this._iInvoiceIndex < 0) {
                return;
            }

            var oModel = this.getView().getModel("invoices");
            var aItems = oModel.getProperty("/invoices/" + this._iInvoiceIndex + "/items") || [];
            aItems.push({ lineId: String((aItems.length + 1) * 10), purchaseOrderId: "", deliveryPlanId: "", amount: 0 });
            oModel.setProperty("/invoices/" + this._iInvoiceIndex + "/items", aItems);
            this._syncCurrentInvoice();
        },

        onDeleteItem: function (oEvent) {
            if (this._iInvoiceIndex === undefined || this._iInvoiceIndex < 0) {
                return;
            }

            var sPath = oEvent.getSource().getBindingContext("invoices").getPath();
            var iItemIndex = parseInt(sPath.split("/").pop(), 10);
            var oModel = this.getView().getModel("invoices");
            var aItems = oModel.getProperty("/invoices/" + this._iInvoiceIndex + "/items") || [];

            aItems.splice(iItemIndex, 1);
            if (!aItems.length) {
                aItems.push({ lineId: "10", purchaseOrderId: "", deliveryPlanId: "", amount: 0 });
            }

            oModel.setProperty("/invoices/" + this._iInvoiceIndex + "/items", aItems);
            this._syncCurrentInvoice();
        },

        onItemChange: function () {
            this._syncCurrentInvoice();
        },

        formatInvoiceStatusText: function (sStatus) {
            var mKey = {
                PENDING: "invoiceStatusPending",
                INVOICED: "invoiceStatusInvoiced",
                VOID: "invoiceStatusVoided"
            };
            return this._getText(mKey[sStatus] || "status");
        },

        _normalizeInvoiceStructure: function (oInvoice) {
            if (!Array.isArray(oInvoice.items) || !oInvoice.items.length) {
                oInvoice.items = [{
                    lineId: "10",
                    purchaseOrderId: oInvoice.purchaseOrderId || "",
                    deliveryPlanId: oInvoice.deliveryPlanId || "",
                    amount: Number(oInvoice.amount || 0)
                }];
            }
            this._syncInvoiceSummary(oInvoice);
        },

        _syncCurrentInvoice: function () {
            if (this._iInvoiceIndex === undefined || this._iInvoiceIndex < 0) {
                return;
            }
            var oModel = this.getView().getModel("invoices");
            var oInvoice = oModel.getProperty("/invoices/" + this._iInvoiceIndex);
            this._syncInvoiceSummary(oInvoice);
            oModel.refresh(true);
        },

        _syncInvoiceSummary: function (oInvoice) {
            var aItems = oInvoice.items || [];
            aItems.forEach(function (oItem, iIndex) {
                oItem.lineId = String((iIndex + 1) * 10);
                oItem.amount = Number(oItem.amount || 0);
            });

            oInvoice.itemCount = aItems.length;
            oInvoice.amount = aItems.reduce(function (fSum, oItem) {
                return fSum + Number(oItem.amount || 0);
            }, 0).toFixed(2);
            oInvoice.purchaseOrderId = aItems.length ? (aItems[0].purchaseOrderId || "") : "";
            oInvoice.deliveryPlanId = aItems.length ? (aItems[0].deliveryPlanId || "") : "";
        },

        _getText: function (sKey) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey);
        }
    });
});