sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/m/MessageToast"
], function (Controller, History, MessageToast) {
    "use strict";

    return Controller.extend("myapp.controller.DeliveryPlanDetail", {

        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteDeliveryPlanDetail").attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: function (oEvent) {
            var sPlanId = oEvent.getParameter("arguments").planId;
            var oModel = this.getView().getModel("deliveryPlans");
            var aPlans = oModel.getProperty("/deliveryPlans");
            var oPlan = aPlans.find(function (item) {
                return item.id === sPlanId;
            });
            if (oPlan) {
                this.getView().bindElement({
                    path: "/deliveryPlans/" + aPlans.indexOf(oPlan),
                    model: "deliveryPlans"
                });
            }
        },

        onNavBack: function () {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("RouteDeliveryPlanList", {}, true);
            }
        },

        onSave: function () {
            MessageToast.show("送货计划保存成功");
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
        }
    });
});