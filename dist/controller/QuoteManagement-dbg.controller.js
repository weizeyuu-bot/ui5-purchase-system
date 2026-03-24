sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend("myapp.controller.QuoteManagement", {

        onInit: function () {
            var oSuppliersModel = this.getOwnerComponent().getModel("suppliers");
            this.getView().setModel(oSuppliersModel, "suppliers");

            var oViewModel = new JSONModel({
                standardPaymentDays: 0,
                annualFundingRate: 10,
                selectedSupplierId: "",
                supplierOptions: [{ id: "", name: this._getText("pleaseSelect") }].concat((oSuppliersModel.getProperty("/suppliers") || [])),
                inputAmount: 0,
                inputPaymentDays: 0,
                quoteItems: [],
                comparisonRows: [],
                chartRows: []
            });
            this.getView().setModel(oViewModel, "quote");
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteHome");
        },

        onAddQuoteItem: function () {
            var oModel = this.getView().getModel("quote");
            var oSuppliersModel = this.getView().getModel("suppliers");
            var aSuppliers = oSuppliersModel.getProperty("/suppliers") || [];

            var sSupplierId = oModel.getProperty("/selectedSupplierId");
            var fAmount = Number(oModel.getProperty("/inputAmount"));
            var iPaymentDays = Number(oModel.getProperty("/inputPaymentDays"));

            if (!sSupplierId) {
                MessageToast.show(this._getText("quoteSupplierRequired"));
                return;
            }
            if (!isFinite(fAmount) || fAmount <= 0) {
                MessageToast.show(this._getText("quoteAmountInvalid"));
                return;
            }
            if (!isFinite(iPaymentDays) || iPaymentDays < 0) {
                MessageToast.show(this._getText("quotePaymentDaysInvalid"));
                return;
            }

            var oSupplier = aSuppliers.find(function (oItem) {
                return oItem.id === sSupplierId;
            });
            if (!oSupplier) {
                MessageToast.show(this._getText("quoteSupplierMissing"));
                return;
            }

            var aItems = oModel.getProperty("/quoteItems") || [];
            var iExistingIndex = aItems.findIndex(function (oItem) {
                return oItem.supplierId === sSupplierId;
            });

            var oNewItem = {
                supplierId: sSupplierId,
                supplierName: oSupplier.name,
                amount: fAmount,
                paymentDays: iPaymentDays
            };

            if (iExistingIndex > -1) {
                aItems[iExistingIndex] = oNewItem;
            } else {
                aItems.push(oNewItem);
            }

            oModel.setProperty("/quoteItems", aItems);
            this._recalculate();

            oModel.setProperty("/inputAmount", 0);
            oModel.setProperty("/inputPaymentDays", 0);
        },

        onRecalculate: function () {
            this._recalculate();
        },

        _recalculate: function () {
            var oModel = this.getView().getModel("quote");
            var aItems = oModel.getProperty("/quoteItems") || [];
            var iStandardDays = Number(oModel.getProperty("/standardPaymentDays"));
            var fAnnualRate = Number(oModel.getProperty("/annualFundingRate"));

            var aRows = aItems.map(function (oItem) {
                var fStandardCost = this._calculateStandardCost(
                    Number(oItem.amount),
                    iStandardDays,
                    Number(oItem.paymentDays),
                    fAnnualRate
                );
                var fAdjustPct = Number(oItem.amount) === 0 ? 0 : ((fStandardCost / Number(oItem.amount)) - 1) * 100;

                return {
                    supplierId: oItem.supplierId,
                    supplierName: oItem.supplierName,
                    amount: this._round(Number(oItem.amount), 2),
                    paymentDays: Number(oItem.paymentDays),
                    adjustmentPct: this._round(fAdjustPct, 2),
                    standardCost: this._round(fStandardCost, 2),
                    isBest: false
                };
            }.bind(this));

            aRows.sort(function (a, b) {
                return a.standardCost - b.standardCost;
            });

            if (aRows.length > 0) {
                aRows[0].isBest = true;
            }

            oModel.setProperty("/comparisonRows", aRows);
            oModel.setProperty("/chartRows", this._buildChartRows(aRows));
        },

        _buildChartRows: function (aRows) {
            if (!aRows.length) {
                return [];
            }

            var fMaxValue = Math.max.apply(null, aRows.map(function (oRow) {
                return Math.max(Number(oRow.amount), Number(oRow.standardCost));
            }));

            if (!isFinite(fMaxValue) || fMaxValue <= 0) {
                fMaxValue = 1;
            }

            return aRows.map(function (oRow) {
                return {
                    supplierName: oRow.supplierName,
                    amount: oRow.amount,
                    standardCost: oRow.standardCost,
                    amountPct: this._round((Number(oRow.amount) / fMaxValue) * 100, 2),
                    standardPct: this._round((Number(oRow.standardCost) / fMaxValue) * 100, 2)
                };
            }.bind(this));
        },

        _calculateStandardCost: function (fQuoteAmount, iStandardDays, iActualDays, fAnnualRatePct) {
            var fRate = Number(fAnnualRatePct) / 100;
            var fFactor = 1 + ((Number(iStandardDays) - Number(iActualDays)) / 365) * fRate;
            return Number(fQuoteAmount) * fFactor;
        },

        _round: function (nValue, iDecimals) {
            var iPower = Math.pow(10, iDecimals || 0);
            return Math.round((Number(nValue) + Number.EPSILON) * iPower) / iPower;
        },

        _getText: function (sKey) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey);
        }
    });
});
