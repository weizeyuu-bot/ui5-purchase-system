sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "myapp/model/models"
], function (Controller, Filter, FilterOperator, JSONModel, MessageBox, models) {
    "use strict";

    return Controller.extend("myapp.controller.PurchaseOrderList", {

        onInit: function () {
            this._oNewPO = {};
            this.getView().setModel(this.getOwnerComponent().getModel("purchaseOrders"), "purchaseOrders");
            models.syncPurchaseOrderPricing(
                this.getOwnerComponent().getModel("purchaseOrders"),
                this.getOwnerComponent().getModel("priceLibrary"),
                this.getOwnerComponent().getModel("suppliers"),
                this.getOwnerComponent().getModel("materials")
            );
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteHome");
        },

        onSearch: function (oEvent) {
            var sQuery = (oEvent.getParameter("query") || oEvent.getParameter("newValue") || "").trim();
            var oTable = this.getView().byId("poTable");
            var oBinding = oTable.getBinding("items");

            if (sQuery) {
                var aFilters = [
                    new Filter("id", FilterOperator.Contains, sQuery),
                    new Filter("vendor", FilterOperator.Contains, sQuery),
                    new Filter("materialName", FilterOperator.Contains, sQuery),
                    new Filter("supplierId", FilterOperator.Contains, sQuery)
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
            this._syncDraftPrice();
            this.getView().byId("poDialog").open();
        },

        onAdd: function () {
            this._oNewPO = {
                id: "",
                supplierId: "",
                materialId: "",
                vendor: "",
                date: this._todayString(),
                quantity: 1,
                unit: "",
                unitPrice: 0,
                amount: "0.00",
                priceValidFrom: "",
                priceValidTo: "",
                priceRecordId: "",
                status: "已下单"
            };
            var oModel = new JSONModel(this._oNewPO);
            this.getView().setModel(oModel, "oNewPO");
            this._bIsEdit = false;
            this._syncDraftPrice();
            this.getView().byId("poDialog").open();
        },

        onPricingConditionChange: function () {
            this._syncDraftPrice();
        },

        onDialogSave: function () {
            var sOrderNumber = this.getView().byId("poNumberInput").getValue().trim();

            if (!sOrderNumber) {
                MessageBox.error("订单号为必填项，请填写！");
                return;
            }

            if (!this._oNewPO.supplierId || !this._oNewPO.materialId || !this._oNewPO.date) {
                MessageBox.error("请选择供应商、物料并填写下单日期！");
                return;
            }

            if (!this._oNewPO.priceMatched) {
                MessageBox.error("当前下单日期未匹配到有效价格，请先维护价格库！");
                return;
            }

            var oOrderModel = this.getView().getModel("purchaseOrders");
            var aOrders = oOrderModel.getProperty("/purchaseOrders");
            this._oNewPO.quantity = Number(this._oNewPO.quantity || 0);

            if (this._bIsEdit) {
                aOrders[this._iEditIndex] = this._oNewPO;
            } else {
                this._oNewPO.id = sOrderNumber;
                aOrders.unshift(this._oNewPO);
            }

            oOrderModel.setProperty("/purchaseOrders", aOrders);
            models.syncPurchaseOrderPricing(
                oOrderModel,
                this.getOwnerComponent().getModel("priceLibrary"),
                this.getOwnerComponent().getModel("suppliers"),
                this.getOwnerComponent().getModel("materials")
            );
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

        _syncDraftPrice: function () {
            var oDraftModel = this.getView().getModel("oNewPO");
            if (!oDraftModel) {
                return;
            }

            var oDraft = oDraftModel.getData();
            var oPrice = models.findEffectivePriceRecord(
                this.getOwnerComponent().getModel("priceLibrary").getProperty("/priceRecords"),
                oDraft.supplierId,
                oDraft.materialId,
                oDraft.date
            );
            var aSuppliers = this.getOwnerComponent().getModel("suppliers").getProperty("/suppliers") || [];
            var aMaterials = this.getOwnerComponent().getModel("materials").getProperty("/materials") || [];
            var oSupplier = aSuppliers.find(function (oItem) { return oItem.id === oDraft.supplierId; });
            var oMaterial = aMaterials.find(function (oItem) { return oItem.id === oDraft.materialId; });
            var iQuantity = Number(oDraft.quantity || 0);

            oDraft.vendor = oSupplier ? oSupplier.name : "";
            oDraft.unit = oMaterial ? oMaterial.unit : "";
            oDraft.materialName = oMaterial ? oMaterial.name : "";
            oDraft.priceMatched = !!oPrice;
            oDraft.unitPrice = oPrice ? Number(oPrice.unitPrice) : 0;
            oDraft.currency = oPrice ? oPrice.currency : "CNY";
            oDraft.priceRecordId = oPrice ? oPrice.id : "";
            oDraft.priceValidFrom = oPrice ? oPrice.validFrom : "";
            oDraft.priceValidTo = oPrice ? oPrice.validTo : "";
            oDraft.priceRemark = oPrice ? oPrice.remark : "未匹配到有效价格";
            oDraft.amount = oPrice ? (iQuantity * Number(oPrice.unitPrice)).toFixed(2) : "0.00";

            var oLowestPrice = models.findLowestPriceRecordForMaterial(
                this.getOwnerComponent().getModel("priceLibrary").getProperty("/priceRecords"),
                oDraft.materialId,
                oDraft.date
            );

            oDraft.lowestPriceRecordId = oLowestPrice ? oLowestPrice.id : "";
            oDraft.lowestMarketPrice = oLowestPrice ? Number(oLowestPrice.unitPrice).toFixed(2) : "0.00";
            oDraft.lowestMarketSupplierName = oLowestPrice ? oLowestPrice.supplierName : "";
            if (!oPrice || !oLowestPrice) {
                oDraft.priceBenchmarkText = "暂无可比价格";
                oDraft.priceBenchmarkState = "None";
            } else if (Number(oPrice.unitPrice) === Number(oLowestPrice.unitPrice)) {
                oDraft.priceBenchmarkText = "当前为最低价";
                oDraft.priceBenchmarkState = "Success";
            } else {
                oDraft.priceBenchmarkText = "高于最低价 " + (Number(oPrice.unitPrice) - Number(oLowestPrice.unitPrice)).toFixed(2);
                oDraft.priceBenchmarkState = "Warning";
            }

            oDraftModel.refresh(true);
        },

        _todayString: function () {
            return new Date().toISOString().slice(0, 10);
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