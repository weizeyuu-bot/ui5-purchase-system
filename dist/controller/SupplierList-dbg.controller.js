sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
], function (Controller, Filter, FilterOperator, JSONModel, MessageBox) {
    "use strict";

    return Controller.extend("myapp.controller.SupplierList", {

        onInit: function () {
            this._oNewSupplier = {};
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteHome");
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("query");
            var oTable = this.getView().byId("supplierTable");
            var oBinding = oTable.getBinding("items");

            if (sQuery) {
                var aFilters = [
                    new Filter("name", FilterOperator.Contains, sQuery),
                    new Filter("id", FilterOperator.Contains, sQuery),
                    new Filter("taxNumber", FilterOperator.Contains, sQuery)
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
            var oItem = oEvent.getSource();
            var sPath = oItem.getBindingContext("suppliers").getPath();
            var sSupplierId = this.getView().getModel("suppliers").getProperty(sPath + "/id");
            this.getOwnerComponent().getRouter().navTo("RouteSupplierDetail", {
                supplierId: sSupplierId
            });
        },

        onViewPress: function (oEvent) {
            var oButton = oEvent.getSource();
            var oItem = oButton.getParent().getParent();
            var sPath = oItem.getBindingContext("suppliers").getPath();
            var sSupplierId = this.getView().getModel("suppliers").getProperty(sPath + "/id");
            this.getOwnerComponent().getRouter().navTo("RouteSupplierDetail", {
                supplierId: sSupplierId
            });
        },

        onEditPress: function (oEvent) {
            var oButton = oEvent.getSource();
            var oItem = oButton.getParent().getParent();
            var sPath = oItem.getBindingContext("suppliers").getPath();
            var oSupplier = this.getView().getModel("suppliers").getProperty(sPath);
            this._oNewSupplier = jQuery.extend({}, oSupplier);
            var oModel = new JSONModel(this._oNewSupplier);
            this.getView().setModel(oModel, "oNewSupplier");
            this._bIsEdit = true;
            this._iEditIndex = parseInt(sPath.split("/").pop(), 10);
            this.getView().byId("supplierDialog").open();
        },

        onAdd: function () {
            this._oNewSupplier = { name: "", taxNumber: "", address: "", contact: "", email: "" };
            var oModel = new JSONModel(this._oNewSupplier);
            this.getView().setModel(oModel, "oNewSupplier");
            this._bIsEdit = false;
            this.getView().byId("supplierDialog").open();
        },

        onDialogSave: function () {
            // 验证必填项
            var sName = this.getView().byId("supplierNameInput").getValue().trim();
            var sTaxNumber = this.getView().byId("supplierTaxInput").getValue().trim();

            if (!sName) {
                MessageBox.error("供应商名称为必填项，请填写！");
                return;
            }
            if (!sTaxNumber) {
                MessageBox.error("税号为必填项，请填写！");
                return;
            }

            var oSupplierModel = this.getView().getModel("suppliers");
            var aSuppliers = oSupplierModel.getProperty("/suppliers");

            if (this._bIsEdit) {
                aSuppliers[this._iEditIndex] = this._oNewSupplier;
            } else {
                var sNewId = "SUP" + (new Date()).getTime();
                this._oNewSupplier.id = sNewId;
                aSuppliers.unshift(this._oNewSupplier);
            }

            oSupplierModel.setProperty("/suppliers", aSuppliers);
            this.getView().byId("supplierDialog").close();
        },

        onDialogCancel: function () {
            this.getView().byId("supplierDialog").close();
        },

        onDeletePress: function (oEvent) {
            var oButton = oEvent.getSource();
            var oItem = oButton.getParent().getParent();
            var sPath = oItem.getBindingContext("suppliers").getPath();
            var oModel = this.getView().getModel("suppliers");
            var aSuppliers = oModel.getProperty("/suppliers");
            var iIndex = parseInt(sPath.split("/").pop(), 10);
            aSuppliers.splice(iIndex, 1);
            oModel.setProperty("/suppliers", aSuppliers);
        }
    });
});