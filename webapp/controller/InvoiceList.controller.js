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
                    new Filter("status", FilterOperator.Contains, sQuery)
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
            this._oNewInvoice = jQuery.extend({}, oInvoice);
            var oModel = new JSONModel(this._oNewInvoice);
            this.getView().setModel(oModel, "oNewInvoice");
            this._bIsEdit = true;
            this._iEditIndex = parseInt(sPath.split("/").pop(), 10);
            this.getView().byId("invoiceDialog").open();
        },

        onAdd: function () {
            this._oNewInvoice = { invoiceNumber: "", purchaseOrderId: "", deliveryPlanId: "", amount: 0, status: "" };
            var oModel = new JSONModel(this._oNewInvoice);
            this.getView().setModel(oModel, "oNewInvoice");
            this._bIsEdit = false;
            this.getView().byId("invoiceDialog").open();
        },

        onDialogSave: function () {
            // 验证必填项
            var sInvoiceNumber = this.getView().byId("invNumberInput").getValue().trim();

            if (!sInvoiceNumber) {
                MessageBox.error("发票号为必填项，请填写！");
                return;
            }

            var oInvoiceModel = this.getView().getModel("invoices");
            var aInvoices = oInvoiceModel.getProperty("/invoices");

            if (this._bIsEdit) {
                aInvoices[this._iEditIndex] = this._oNewInvoice;
            } else {
                var sNewId = "INV" + (new Date()).getTime();
                this._oNewInvoice.id = sNewId;
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
        }
    });
});