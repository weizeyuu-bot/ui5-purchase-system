sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "myapp/model/models"
], function (Controller, History, MessageToast, JSONModel, models) {
    "use strict";

    return Controller.extend("myapp.controller.PurchaseOrderDetail", {

        onInit: function () {
            this.getView().setModel(this.getOwnerComponent().getModel("purchaseOrders"), "purchaseOrders");
            this.getView().setModel(new JSONModel({
                supplierOptions: [{ id: "", name: this._getText("pleaseSelect") }].concat(this.getOwnerComponent().getModel("suppliers").getProperty("/suppliers") || []),
                materialOptions: [{ id: "", name: this._getText("pleaseSelect") }].concat(this.getOwnerComponent().getModel("materials").getProperty("/materials") || [])
            }), "selectOptions");
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
            MessageToast.show(this._getText("purchaseOrderSaved"));
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

        onAddItem: function () {
            if (this._iOrderIndex === undefined || this._iOrderIndex < 0) {
                return;
            }

            var oModel = this.getView().getModel("purchaseOrders");
            var aItems = oModel.getProperty("/purchaseOrders/" + this._iOrderIndex + "/items") || [];
            aItems.push({
                lineId: String((aItems.length + 1) * 10),
                materialId: "",
                materialName: "",
                quantity: 1,
                unit: "",
                unitPrice: 0,
                currency: "CNY",
                amount: "0.00",
                priceRecordId: "",
                priceValidFrom: "",
                priceValidTo: "",
                priceMatched: false,
                priceStatusText: "MISSING",
                priceStatusState: "Error",
                lowestPriceRecordId: "",
                lowestMarketPrice: "0.00",
                lowestMarketSupplierName: "",
                priceBenchmarkText: this._getText("poNoComparablePrice"),
                priceBenchmarkState: "None"
            });
            oModel.setProperty("/purchaseOrders/" + this._iOrderIndex + "/items", aItems);
            this.onPricingConditionChange();
        },

        onDeleteItem: function (oEvent) {
            if (this._iOrderIndex === undefined || this._iOrderIndex < 0) {
                return;
            }

            var sPath = oEvent.getSource().getBindingContext("purchaseOrders").getPath();
            var iItemIndex = parseInt(sPath.split("/").pop(), 10);
            var oModel = this.getView().getModel("purchaseOrders");
            var aItems = oModel.getProperty("/purchaseOrders/" + this._iOrderIndex + "/items") || [];

            aItems.splice(iItemIndex, 1);
            if (!aItems.length) {
                aItems.push({
                    lineId: "10",
                    materialId: "",
                    materialName: "",
                    quantity: 1,
                    unit: "",
                    unitPrice: 0,
                    currency: "CNY",
                    amount: "0.00",
                    priceRecordId: "",
                    priceValidFrom: "",
                    priceValidTo: "",
                    priceMatched: false,
                    priceStatusText: "MISSING",
                    priceStatusState: "Error",
                    lowestPriceRecordId: "",
                    lowestMarketPrice: "0.00",
                    lowestMarketSupplierName: "",
                    priceBenchmarkText: this._getText("poNoComparablePrice"),
                    priceBenchmarkState: "None"
                });
            }

            oModel.setProperty("/purchaseOrders/" + this._iOrderIndex + "/items", aItems);
            this.onPricingConditionChange();
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
        },

        formatOrderStatusText: function (sStatus) {
            var mKey = {
                ORDERED: "statusOrderPlaced",
                PROCESSING: "statusProcessing",
                RECEIVED: "statusReceived",
                CANCELLED: "statusCancelled"
            };
            return this._getText(mKey[sStatus] || "status");
        },

        formatOrderStatusState: function (sStatus) {
            var mState = {
                ORDERED: "Information",
                PROCESSING: "Warning",
                RECEIVED: "Success",
                CANCELLED: "Error"
            };
            return mState[sStatus] || "None";
        },

        formatPriceMatchText: function (sStatus) {
            return this._getText(sStatus === "MATCHED" ? "priceMatched" : "priceMissing");
        },

        _getText: function (sKey) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey);
        }

    });
});