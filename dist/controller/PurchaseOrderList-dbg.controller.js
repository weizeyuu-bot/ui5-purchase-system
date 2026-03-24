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
                    new Filter("materialSummary", FilterOperator.Contains, sQuery),
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
            this._navToOrderDetail(sOrderId);
        },

        onEditPress: function (oEvent) {
            var oButton = oEvent.getSource();
            var oItem = oButton.getParent().getParent();
            var sPath = oItem.getBindingContext("purchaseOrders").getPath();
            var sOrderId = this.getView().getModel("purchaseOrders").getProperty(sPath + "/id");
            this._navToOrderDetail(sOrderId);
        },

        onAdd: function () {
            this._oNewPO = this._createEmptyOrderDraft();
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
            var aDraftItems = this._oNewPO.items || [];

            if (!sOrderNumber) {
                MessageBox.error(this._getText("purchaseOrderIdRequired"));
                return;
            }

            if (!this._oNewPO.supplierId || !this._oNewPO.date || !aDraftItems.length) {
                MessageBox.error(this._getText("purchaseOrderConditionRequired"));
                return;
            }

            if (!this._oNewPO.status) {
                MessageBox.error(this._getText("statusRequired"));
                return;
            }

            if (aDraftItems.some(function (oItem) {
                return !oItem.materialId || !Number(oItem.quantity || 0);
            })) {
                MessageBox.error(this._getText("purchaseOrderItemRequired"));
                return;
            }

            if (aDraftItems.some(function (oItem) {
                return !oItem.priceMatched;
            })) {
                MessageBox.error(this._getText("purchaseOrderPriceMissing"));
                return;
            }

            var oOrderModel = this.getView().getModel("purchaseOrders");
            var aOrders = oOrderModel.getProperty("/purchaseOrders");

            this._oNewPO.id = sOrderNumber;
            this._oNewPO.items = aDraftItems.map(function (oItem, iIndex) {
                return Object.assign({}, oItem, {
                    lineId: oItem.lineId || this._buildLineId(iIndex),
                    quantity: Number(oItem.quantity || 0)
                });
            }, this);
            aOrders.unshift(this._oNewPO);

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

        onAddDraftItem: function () {
            var oDraftModel = this.getView().getModel("oNewPO");
            if (!oDraftModel) {
                return;
            }

            var oDraft = oDraftModel.getData();
            var aItems = oDraft.items || [];
            aItems.push(this._createEmptyOrderItem(this._buildLineId(aItems.length)));
            oDraft.items = aItems;
            this._syncDraftPrice();
        },

        onDeleteDraftItem: function (oEvent) {
            var oDraftModel = this.getView().getModel("oNewPO");
            if (!oDraftModel) {
                return;
            }

            var sPath = oEvent.getSource().getBindingContext("oNewPO").getPath();
            var iItemIndex = parseInt(sPath.split("/").pop(), 10);
            var oDraft = oDraftModel.getData();
            var aItems = oDraft.items || [];

            aItems.splice(iItemIndex, 1);
            if (!aItems.length) {
                aItems.push(this._createEmptyOrderItem("10"));
            }

            aItems.forEach(function (oItem, iIndex) {
                oItem.lineId = this._buildLineId(iIndex);
            }, this);
            oDraft.items = aItems;
            this._syncDraftPrice();
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
            var aItems = oDraft.items || [];
            if (!aItems.length) {
                return;
            }

            var aPriceRecords = this.getOwnerComponent().getModel("priceLibrary").getProperty("/priceRecords");
            var aSuppliers = this.getOwnerComponent().getModel("suppliers").getProperty("/suppliers") || [];
            var aMaterials = this.getOwnerComponent().getModel("materials").getProperty("/materials") || [];
            var oSupplier = aSuppliers.find(function (oItem) { return oItem.id === oDraft.supplierId; });
            var fTotalAmount = 0;
            var iTotalQuantity = 0;
            var aMaterialNames = [];
            var bAllMatched = true;
            var sCurrency = "CNY";

            oDraft.vendor = oSupplier ? oSupplier.name : "";

            aItems.forEach(function (oItem, iIndex) {
                var oMaterial = aMaterials.find(function (oMaterialItem) {
                    return oMaterialItem.id === oItem.materialId;
                });
                var oPrice = models.findEffectivePriceRecord(
                    aPriceRecords,
                    oDraft.supplierId,
                    oItem.materialId,
                    oDraft.date
                );
                var oLowestPrice = models.findLowestPriceRecordForMaterial(
                    aPriceRecords,
                    oItem.materialId,
                    oDraft.date
                );
                var iQuantity = Number(oItem.quantity || 0);

                oItem.lineId = this._buildLineId(iIndex);
                oItem.materialName = oMaterial ? oMaterial.name : "";
                oItem.unit = oMaterial ? oMaterial.unit : "";
                oItem.priceMatched = !!oPrice;
                oItem.unitPrice = oPrice ? Number(oPrice.unitPrice) : 0;
                oItem.currency = oPrice ? oPrice.currency : "CNY";
                oItem.priceRecordId = oPrice ? oPrice.id : "";
                oItem.priceValidFrom = oPrice ? oPrice.validFrom : "";
                oItem.priceValidTo = oPrice ? oPrice.validTo : "";
                oItem.priceRemark = oPrice ? oPrice.remark : this._getText("poPriceMissing");
                oItem.priceStatusText = oPrice ? "MATCHED" : "MISSING";
                oItem.priceStatusState = oPrice ? "Success" : "Error";
                oItem.amount = oPrice ? (iQuantity * Number(oPrice.unitPrice)).toFixed(2) : "0.00";
                oItem.lowestPriceRecordId = oLowestPrice ? oLowestPrice.id : "";
                oItem.lowestMarketPrice = oLowestPrice ? Number(oLowestPrice.unitPrice).toFixed(2) : "0.00";
                oItem.lowestMarketSupplierName = oLowestPrice ? oLowestPrice.supplierName : "";

                if (!oPrice || !oLowestPrice) {
                    oItem.priceBenchmarkText = this._getText("poNoComparablePrice");
                    oItem.priceBenchmarkState = "None";
                } else if (Number(oPrice.unitPrice) === Number(oLowestPrice.unitPrice)) {
                    oItem.priceBenchmarkText = this._getText("poAtLowestPrice");
                    oItem.priceBenchmarkState = "Success";
                } else {
                    oItem.priceBenchmarkText = this._getText("poHigherThanLowestPrice", [(Number(oPrice.unitPrice) - Number(oLowestPrice.unitPrice)).toFixed(2)]);
                    oItem.priceBenchmarkState = "Warning";
                }

                fTotalAmount += Number(oItem.amount || 0);
                iTotalQuantity += iQuantity;
                bAllMatched = bAllMatched && !!oItem.priceMatched;
                sCurrency = oItem.currency || sCurrency;
                if (oItem.materialName) {
                    aMaterialNames.push(oItem.materialName);
                }
            }, this);

            oDraft.itemCount = aItems.length;
            oDraft.totalQuantity = iTotalQuantity;
            oDraft.currency = sCurrency;
            oDraft.amount = fTotalAmount.toFixed(2);
            oDraft.materialSummary = aMaterialNames.join(" / ");
            oDraft.priceMatched = bAllMatched;

            oDraftModel.refresh(true);
        },

        _createEmptyOrderDraft: function () {
            var aSuppliers = this.getOwnerComponent().getModel("suppliers").getProperty("/suppliers") || [];
            var aMaterials = this.getOwnerComponent().getModel("materials").getProperty("/materials") || [];
            return {
                id: "",
                supplierId: "",
                vendor: "",
                date: this._todayString(),
                status: "",
                currency: "CNY",
                amount: "0.00",
                itemCount: 1,
                totalQuantity: 0,
                supplierOptions: [{ id: "", name: this._getText("pleaseSelect") }].concat(aSuppliers),
                materialOptions: [{ id: "", name: this._getText("pleaseSelect") }].concat(aMaterials),
                items: [
                    this._createEmptyOrderItem("10")
                ]
            };
        },

        _createEmptyOrderItem: function (sLineId) {
            return {
                lineId: sLineId,
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
                priceBenchmarkText: "",
                priceBenchmarkState: "None",
                lowestMarketPrice: "0.00",
                lowestMarketSupplierName: ""
            };
        },

        _buildLineId: function (iIndex) {
            return String((iIndex + 1) * 10);
        },

        _navToOrderDetail: function (sOrderId) {
            this.getOwnerComponent().getRouter().navTo("RoutePurchaseOrderDetail", {
                orderId: sOrderId
            });
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

        formatPriceMatchText: function (sStatus) {
            return this._getText(sStatus === "MATCHED" ? "priceMatched" : "priceMissing");
        },

        _getText: function (sKey, aArgs) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey, aArgs);
        }
    });
});