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
                    new Filter("status", FilterOperator.Contains, sQuery),
                    new Filter("purchaseOrderId", FilterOperator.Contains, sQuery)
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
            this._oNewDP = this._createDraftFromPlan(oDP);
            var oModel = new JSONModel(this._oNewDP);
            this.getView().setModel(oModel, "oNewDP");
            this._bIsEdit = true;
            this._iEditIndex = parseInt(sPath.split("/").pop(), 10);
            this.getView().byId("dpDialog").open();
        },

        onAdd: function () {
            this._oNewDP = this._createEmptyDraft();
            var oModel = new JSONModel(this._oNewDP);
            this.getView().setModel(oModel, "oNewDP");
            this._bIsEdit = false;
            this.getView().byId("dpDialog").open();
        },

        onAddDraftItem: function () {
            var oDraftModel = this.getView().getModel("oNewDP");
            if (!oDraftModel) {
                return;
            }

            var oDraft = oDraftModel.getData();
            var aItems = oDraft.items || [];
            aItems.push(this._createEmptyItem(this._buildLineId(aItems.length)));
            oDraft.items = aItems;
            this._syncDraftSummary(oDraft);
            oDraftModel.refresh(true);
        },

        onDeleteDraftItem: function (oEvent) {
            var oDraftModel = this.getView().getModel("oNewDP");
            if (!oDraftModel) {
                return;
            }

            var sPath = oEvent.getSource().getBindingContext("oNewDP").getPath();
            var iItemIndex = parseInt(sPath.split("/").pop(), 10);
            var oDraft = oDraftModel.getData();
            var aItems = oDraft.items || [];

            aItems.splice(iItemIndex, 1);
            if (!aItems.length) {
                aItems.push(this._createEmptyItem("10"));
            }

            aItems.forEach(function (oLine, iIndex) {
                oLine.lineId = this._buildLineId(iIndex);
            }, this);
            oDraft.items = aItems;
            this._syncDraftSummary(oDraft);
            oDraftModel.refresh(true);
        },

        onDraftItemChange: function () {
            var oDraftModel = this.getView().getModel("oNewDP");
            if (!oDraftModel) {
                return;
            }
            var oDraft = oDraftModel.getData();
            this._syncDraftSummary(oDraft);
            oDraftModel.refresh(true);
        },

        onDialogSave: function () {
            // 验证必填项
            var sPlanNumber = this.getView().byId("dpPlanNumberInput").getValue().trim();
            var aItems = this._oNewDP.items || [];

            if (!sPlanNumber) {
                MessageBox.error(this._getText("deliveryPlanIdRequired"));
                return;
            }

            if (!aItems.length || aItems.some(function (oLine) {
                return !oLine.purchaseOrderId || !Number(oLine.quantity || 0);
            })) {
                MessageBox.error(this._getText("deliveryPlanItemRequired"));
                return;
            }

            if (!this._oNewDP.status) {
                MessageBox.error(this._getText("statusRequired"));
                return;
            }

            this._oNewDP.id = sPlanNumber;
            this._oNewDP.items = aItems.map(function (oLine, iIndex) {
                return {
                    lineId: this._buildLineId(iIndex),
                    purchaseOrderId: oLine.purchaseOrderId,
                    quantity: Number(oLine.quantity || 0)
                };
            }, this);
            this._syncDraftSummary(this._oNewDP);

            var oDPModel = this.getView().getModel("deliveryPlans");
            var aPlans = oDPModel.getProperty("/deliveryPlans");

            if (this._bIsEdit) {
                aPlans[this._iEditIndex] = this._oNewDP;
            } else {
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

        _createDraftFromPlan: function (oPlan) {
            var oDraft = JSON.parse(JSON.stringify(oPlan || {}));
            var aItems = Array.isArray(oDraft.items) ? oDraft.items : [];
            if (!aItems.length) {
                aItems.push(this._createEmptyItem("10"));
            }
            oDraft.planNumber = oDraft.id || "";
            oDraft.date = oDraft.date || this._todayString();
            oDraft.status = oDraft.status || "";
            oDraft.items = aItems;
            oDraft.purchaseOrderOptions = this._buildPurchaseOrderOptions();
            this._syncDraftSummary(oDraft);
            return oDraft;
        },

        _createEmptyDraft: function () {
            var oDraft = {
                id: "",
                planNumber: "",
                date: this._todayString(),
                status: "",
                purchaseOrderId: "",
                itemCount: 1,
                totalQuantity: 0,
                purchaseOrderOptions: this._buildPurchaseOrderOptions(),
                items: [this._createEmptyItem("10")]
            };
            this._syncDraftSummary(oDraft);
            return oDraft;
        },

        _createEmptyItem: function (sLineId) {
            return {
                lineId: sLineId,
                purchaseOrderId: "",
                quantity: 0
            };
        },

        _buildLineId: function (iIndex) {
            return String((iIndex + 1) * 10);
        },

        _syncDraftSummary: function (oDraft) {
            var aItems = oDraft.items || [];
            var iTotalQuantity = aItems.reduce(function (iSum, oLine) {
                return iSum + Number(oLine.quantity || 0);
            }, 0);

            oDraft.itemCount = aItems.length;
            oDraft.totalQuantity = iTotalQuantity;
            oDraft.purchaseOrderId = aItems.length ? (aItems[0].purchaseOrderId || "") : "";
        },

        _todayString: function () {
            return new Date().toISOString().slice(0, 10);
        },

        _buildPurchaseOrderOptions: function () {
            var aOrders = this.getOwnerComponent().getModel("purchaseOrders").getProperty("/purchaseOrders") || [];
            return [{ id: "", name: this._getText("pleaseSelect") }].concat(aOrders.map(function (oOrder) {
                return {
                    id: oOrder.id,
                    name: oOrder.id + " - " + (oOrder.vendor || "")
                };
            }));
        },

        _getText: function (sKey) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey);
        }
    });
});