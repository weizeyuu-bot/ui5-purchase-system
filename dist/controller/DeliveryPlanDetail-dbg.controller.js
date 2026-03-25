sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel"
], function (Controller, History, MessageToast, MessageBox, JSONModel) {
    "use strict";

    return Controller.extend("myapp.controller.DeliveryPlanDetail", {

        onInit: function () {
            this.getView().setModel(new JSONModel({
                purchaseOrderOptions: [{ id: "", name: this._getText("pleaseSelect") }].concat(this.getOwnerComponent().getModel("purchaseOrders").getProperty("/purchaseOrders") || []).map(function (oOrder) {
                    return {
                        id: oOrder.id,
                        name: oOrder.id + " - " + (oOrder.vendor || "")
                    };
                })
            }), "selectOptions");

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
                this._iPlanIndex = aPlans.indexOf(oPlan);
                this._normalizePlanStructure(oPlan);
                this.getView().bindElement({
                    path: "/deliveryPlans/" + this._iPlanIndex,
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
            var oModel = this.getView().getModel("deliveryPlans");
            var oPlan = oModel.getProperty("/deliveryPlans/" + this._iPlanIndex);
            var aItems = (oPlan && oPlan.items) || [];

            if (!aItems.length || aItems.some(function (oLine) {
                return !oLine.purchaseOrderId || !Number(oLine.quantity || 0);
            })) {
                MessageBox.error(this._getText("deliveryPlanItemRequired"));
                return;
            }

            if (aItems.some(function (oLine) {
                return !this._isPurchaseOrderExists(oLine.purchaseOrderId);
            }, this)) {
                MessageBox.error(this._getText("deliveryPlanPurchaseOrderRequired"));
                return;
            }

            this._syncCurrentPlan();
            MessageToast.show(this._getText("deliveryPlanSaved"));
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

        onAddItem: function () {
            if (this._iPlanIndex === undefined || this._iPlanIndex < 0) {
                return;
            }

            var oModel = this.getView().getModel("deliveryPlans");
            var aItems = oModel.getProperty("/deliveryPlans/" + this._iPlanIndex + "/items") || [];
            aItems.push({ lineId: String((aItems.length + 1) * 10), purchaseOrderId: "", quantity: 0 });
            oModel.setProperty("/deliveryPlans/" + this._iPlanIndex + "/items", aItems);
            this._syncCurrentPlan();
        },

        onDeleteItem: function (oEvent) {
            if (this._iPlanIndex === undefined || this._iPlanIndex < 0) {
                return;
            }

            var sPath = oEvent.getSource().getBindingContext("deliveryPlans").getPath();
            var iItemIndex = parseInt(sPath.split("/").pop(), 10);
            var oModel = this.getView().getModel("deliveryPlans");
            var aItems = oModel.getProperty("/deliveryPlans/" + this._iPlanIndex + "/items") || [];

            aItems.splice(iItemIndex, 1);
            if (!aItems.length) {
                aItems.push({ lineId: "10", purchaseOrderId: "", quantity: 0 });
            }

            oModel.setProperty("/deliveryPlans/" + this._iPlanIndex + "/items", aItems);
            this._syncCurrentPlan();
        },

        onItemChange: function () {
            this._syncCurrentPlan();
        },

        formatDeliveryStatusText: function (sStatus) {
            var mKey = {
                PENDING: "deliveryStatusPending",
                SHIPPED: "deliveryStatusShipped",
                IN_TRANSIT: "deliveryStatusInTransit",
                DELIVERED: "deliveryStatusDelivered"
            };
            return this._getText(mKey[sStatus] || "status");
        },

        _normalizePlanStructure: function (oPlan) {
            if (!Array.isArray(oPlan.items) || !oPlan.items.length) {
                oPlan.items = [{
                    lineId: "10",
                    purchaseOrderId: oPlan.purchaseOrderId || "",
                    quantity: Number(oPlan.quantity || oPlan.totalQuantity || 0)
                }];
            }
            this._syncPlanSummary(oPlan);
        },

        _syncCurrentPlan: function () {
            if (this._iPlanIndex === undefined || this._iPlanIndex < 0) {
                return;
            }
            var oModel = this.getView().getModel("deliveryPlans");
            var oPlan = oModel.getProperty("/deliveryPlans/" + this._iPlanIndex);
            this._syncPlanSummary(oPlan);
            oModel.refresh(true);
        },

        _syncPlanSummary: function (oPlan) {
            var aItems = oPlan.items || [];
            aItems.forEach(function (oItem, iIndex) {
                oItem.lineId = String((iIndex + 1) * 10);

                if (!oItem.purchaseOrderId) {
                    oItem.quantity = Number(oItem.quantity || 0);
                    return;
                }

                if (!Number(oItem.quantity || 0)) {
                    var oOrder = this._findPurchaseOrderById(oItem.purchaseOrderId);
                    oItem.quantity = Number(oOrder ? (oOrder.totalQuantity || oOrder.quantity || 0) : 0);
                } else {
                    oItem.quantity = Number(oItem.quantity || 0);
                }
            }, this);

            oPlan.itemCount = aItems.length;
            oPlan.totalQuantity = aItems.reduce(function (iSum, oItem) {
                return iSum + Number(oItem.quantity || 0);
            }, 0);
            oPlan.purchaseOrderId = aItems.length ? (aItems[0].purchaseOrderId || "") : "";
        },

        _findPurchaseOrderById: function (sPurchaseOrderId) {
            var aOrders = this.getOwnerComponent().getModel("purchaseOrders").getProperty("/purchaseOrders") || [];
            return aOrders.find(function (oOrder) {
                return oOrder.id === sPurchaseOrderId;
            });
        },

        _isPurchaseOrderExists: function (sPurchaseOrderId) {
            if (!sPurchaseOrderId) {
                return false;
            }
            return !!this._findPurchaseOrderById(sPurchaseOrderId);
        },

        _getText: function (sKey) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey);
        }
    });
});