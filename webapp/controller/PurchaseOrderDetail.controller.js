sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/m/MessageToast",
    "myapp/model/models"
], function (Controller, History, MessageToast, models) {
    "use strict";

    return Controller.extend("myapp.controller.PurchaseOrderDetail", {

        onInit: function () {
            this.getView().setModel(this.getOwnerComponent().getModel("purchaseOrders"), "purchaseOrders");
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
            models.syncPurchaseOrderPricing(
                this.getOwnerComponent().getModel("purchaseOrders"),
                this.getOwnerComponent().getModel("priceLibrary"),
                this.getOwnerComponent().getModel("suppliers"),
                this.getOwnerComponent().getModel("materials")
            );
            MessageToast.show("采购订单保存成功");
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
        },

        onCancel: function () {
            this.onNavBack();
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