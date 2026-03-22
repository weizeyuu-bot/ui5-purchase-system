sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/m/MessageToast"
], function (Controller, History, MessageToast) {
    "use strict";

    return Controller.extend("myapp.controller.InvoiceDetail", {

        onInit: function () {
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
                this.getView().bindElement({
                    path: "/invoices/" + aInvoices.indexOf(oInvoice),
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
            MessageToast.show("发票保存成功");
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
        }
    });
});