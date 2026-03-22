sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
], function (Controller, Filter, FilterOperator, JSONModel, MessageBox) {
    "use strict";

    return Controller.extend("myapp.controller.DeliveryPlanList", {

        onInit: function () {
            this._oNewDP = {};
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteHome");
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("query");
            var oTable = this.getView().byId("deliveryTable");
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
            var sPath = oEvent.getSource().getBindingContext("deliveryPlans").getPath();
            var sPlanId = this.getView().getModel("deliveryPlans").getProperty(sPath + "/id");
            this.getOwnerComponent().getRouter().navTo("RouteDeliveryPlanDetail", {
                planId: sPlanId
            });
        },

        onViewPress: function (oEvent) {
            var oButton = oEvent.getSource();
            var oItem = oButton.getParent().getParent();
            var sPath = oItem.getBindingContext("deliveryPlans").getPath();
            var sPlanId = this.getView().getModel("deliveryPlans").getProperty(sPath + "/id");
            this.getOwnerComponent().getRouter().navTo("RouteDeliveryPlanDetail", {
                planId: sPlanId
            });
        },

        onEditPress: function (oEvent) {
            var oButton = oEvent.getSource();
            var oItem = oButton.getParent().getParent();
            var sPath = oItem.getBindingContext("deliveryPlans").getPath();
            var oDP = this.getView().getModel("deliveryPlans").getProperty(sPath);
            this._oNewDP = jQuery.extend({}, oDP);
            var oModel = new JSONModel(this._oNewDP);
            this.getView().setModel(oModel, "oNewDP");
            this._bIsEdit = true;
            this._iEditIndex = parseInt(sPath.split("/").pop(), 10);
            this.getView().byId("dpDialog").open();
        },

        onAdd: function () {
            this._oNewDP = { planNumber: "", purchaseOrderId: "", deliveryDate: "", quantity: 0, status: "" };
            var oModel = new JSONModel(this._oNewDP);
            this.getView().setModel(oModel, "oNewDP");
            this._bIsEdit = false;
            this.getView().byId("dpDialog").open();
        },

        onDialogSave: function () {
            // 验证必填项
            var sPlanNumber = this.getView().byId("dpPlanNumberInput").getValue().trim();

            if (!sPlanNumber) {
                MessageBox.error("计划号为必填项，请填写！");
                return;
            }

            var oDPModel = this.getView().getModel("deliveryPlans");
            var aPlans = oDPModel.getProperty("/deliveryPlans");

            if (this._bIsEdit) {
                aPlans[this._iEditIndex] = this._oNewDP;
            } else {
                var sNewId = "DP" + (new Date()).getTime();
                this._oNewDP.id = sNewId;
                aPlans.unshift(this._oNewDP);
            }

            oDPModel.setProperty("/deliveryPlans", aPlans);
            this.getView().byId("dpDialog").close();
        },

        onDialogCancel: function () {
            this.getView().byId("dpDialog").close();
        },

        onDeletePress: function (oEvent) {
            var oButton = oEvent.getSource();
            var oItem = oButton.getParent().getParent();
            var sPath = oItem.getBindingContext("deliveryPlans").getPath();
            var oModel = this.getView().getModel("deliveryPlans");
            var aPlans = oModel.getProperty("/deliveryPlans");
            var iIndex = parseInt(sPath.split("/").pop(), 10);
            aPlans.splice(iIndex, 1);
            oModel.setProperty("/deliveryPlans", aPlans);
        },

        onNavigateToPurchaseOrder: function (oEvent) {
            var sPurchaseOrderId = oEvent.getSource().getText();
            this.getOwnerComponent().getRouter().navTo("RoutePurchaseOrderDetail", {
                orderId: sPurchaseOrderId
            });
        }
    });
});