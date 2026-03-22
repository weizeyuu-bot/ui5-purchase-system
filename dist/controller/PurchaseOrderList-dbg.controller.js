sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
], function (Controller, Filter, FilterOperator, JSONModel, MessageBox) {
    "use strict";

    return Controller.extend("myapp.controller.PurchaseOrderList", {

        onInit: function () {
            this._oNewPO = {};
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteHome");
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("query");
            var oTable = this.getView().byId("poTable");
            var oBinding = oTable.getBinding("items");

            if (sQuery) {
                var aFilters = [
                    new Filter("id", FilterOperator.Contains, sQuery),
                    new Filter("vendor", FilterOperator.Contains, sQuery)
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
            this.getOwnerComponent().getRouter().navTo("RoutePurchaseOrderDetail", {
                orderId: sOrderId
            });
        },

        onEditPress: function (oEvent) {
            var oButton = oEvent.getSource();
            var oItem = oButton.getParent().getParent();
            var sPath = oItem.getBindingContext("purchaseOrders").getPath();
            var oPO = this.getView().getModel("purchaseOrders").getProperty(sPath);
            this._oNewPO = jQuery.extend({}, oPO);
            var oModel = new JSONModel(this._oNewPO);
            this.getView().setModel(oModel, "oNewPO");
            this._bIsEdit = true;
            this._iEditIndex = parseInt(sPath.split("/").pop(), 10);
            this.getView().byId("poDialog").open();
        },

        onAdd: function () {
            this._oNewPO = { orderNumber: "", supplierId: "", materialId: "", vendor: "", quantity: 0, amount: 0, status: "" };
            var oModel = new JSONModel(this._oNewPO);
            this.getView().setModel(oModel, "oNewPO");
            this._bIsEdit = false;
            this.getView().byId("poDialog").open();
        },

        onDialogSave: function () {
            // 验证必填项
            var sOrderNumber = this.getView().byId("poNumberInput").getValue().trim();

            if (!sOrderNumber) {
                MessageBox.error("订单号为必填项，请填写！");
                return;
            }

            var oOrderModel = this.getView().getModel("purchaseOrders");
            var aOrders = oOrderModel.getProperty("/purchaseOrders");

            if (this._bIsEdit) {
                aOrders[this._iEditIndex] = this._oNewPO;
            } else {
                var sNewId = "PO" + (new Date()).getTime();
                this._oNewPO.id = sNewId;
                aOrders.unshift(this._oNewPO);
            }

            oOrderModel.setProperty("/purchaseOrders", aOrders);
            this.getView().byId("poDialog").close();
        },

        onDialogCancel: function () {
            this.getView().byId("poDialog").close();
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
        }
    });
});