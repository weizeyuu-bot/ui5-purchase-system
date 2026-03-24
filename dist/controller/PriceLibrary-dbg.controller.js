sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Label",
    "sap/m/Input",
    "sap/m/DatePicker",
    "sap/m/Select",
    "sap/ui/core/Item",
    "sap/ui/layout/form/SimpleForm",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "myapp/model/models"
], function (
    Controller,
    MessageToast,
    MessageBox,
    Dialog,
    Button,
    Label,
    Input,
    DatePicker,
    Select,
    Item,
    SimpleForm,
    JSONModel,
    Filter,
    FilterOperator,
    models
) {
    "use strict";

    return Controller.extend("myapp.controller.PriceLibrary", {
        onInit: function () {
            this.getView().setModel(this.getOwnerComponent().getModel("priceLibrary"), "priceLibrary");
            this._oDialog = null;
            models.annotatePriceLibraryRecords(this.getOwnerComponent().getModel("priceLibrary"));
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteHome");
        },

        onNavigateToSupplier: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("priceLibrary");
            if (!oContext) {
                return;
            }

            this.getOwnerComponent().getRouter().navTo("RouteSupplierDetail", {
                supplierId: oContext.getProperty("supplierId")
            });
        },

        onNavigateToMaterial: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("priceLibrary");
            if (!oContext) {
                return;
            }

            this.getOwnerComponent().getRouter().navTo("RouteMaterialDetail", {
                materialId: oContext.getProperty("materialId")
            });
        },

        onSearch: function (oEvent) {
            var sValue = (oEvent.getParameter("query") || oEvent.getParameter("newValue") || "").trim();
            var oBinding = this.byId("priceTable").getBinding("items");
            if (!oBinding) {
                return;
            }

            if (!sValue) {
                oBinding.filter([]);
                return;
            }

            oBinding.filter(new Filter({
                filters: [
                    new Filter("id", FilterOperator.Contains, sValue),
                    new Filter("supplierName", FilterOperator.Contains, sValue),
                    new Filter("materialName", FilterOperator.Contains, sValue),
                    new Filter("remark", FilterOperator.Contains, sValue)
                ],
                and: false
            }));
        },

        onAddPrice: function () {
            this._openDialog("add");
        },

        onEditPrice: function (oEvent) {
            var oContext = oEvent.getSource().getParent().getParent().getBindingContext("priceLibrary");
            if (!oContext) {
                return;
            }
            this._openDialog("edit", oContext.getObject(), oContext.getPath());
        },

        onDeletePrice: function (oEvent) {
            var oContext = oEvent.getSource().getParent().getParent().getBindingContext("priceLibrary");
            if (!oContext) {
                return;
            }

            var sPath = oContext.getPath();
            var iIndex = parseInt(sPath.split("/").pop(), 10);
            var oPriceModel = this.getView().getModel("priceLibrary");
            var aRecords = oPriceModel.getProperty("/priceRecords") || [];
            var that = this;

            MessageBox.confirm(this._getText("priceDeleteConfirm"), {
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.OK,
                onClose: function (sAction) {
                    if (sAction !== MessageBox.Action.OK) {
                        return;
                    }

                    aRecords.splice(iIndex, 1);
                    oPriceModel.setProperty("/priceRecords", aRecords);
                    that._syncPurchaseOrders();
                    MessageToast.show(that._getText("priceRecordDeleted"));
                }
            });
        },

        _openDialog: function (sMode, oRecord, sPath) {
            var oDialog = this._getDialog();
            var oDialogModel = new JSONModel(this._buildDialogData(sMode, oRecord, sPath));
            oDialog.setModel(oDialogModel, "dialog");
            this._syncDialogDerivedFields(oDialogModel);
            oDialog.setTitle(this._getText(sMode === "add" ? "priceAddRecord" : "priceEditRecord"));
            oDialog.open();
        },

        _buildDialogData: function (sMode, oRecord, sPath) {
            var aSuppliers = this.getOwnerComponent().getModel("suppliers").getProperty("/suppliers") || [];
            var aMaterials = this.getOwnerComponent().getModel("materials").getProperty("/materials") || [];
            var aSupplierOptions = [{ id: "", name: this._getText("pleaseSelect") }].concat(aSuppliers);
            var aMaterialOptions = [{ id: "", name: this._getText("pleaseSelect") }].concat(aMaterials);

            return {
                mode: sMode,
                path: sPath || "",
                id: oRecord ? oRecord.id : "",
                supplierId: oRecord ? oRecord.supplierId : "",
                materialId: oRecord ? oRecord.materialId : "",
                supplierOptions: aSupplierOptions,
                materialOptions: aMaterialOptions,
                validFrom: oRecord ? oRecord.validFrom : this._todayString(),
                validTo: oRecord ? oRecord.validTo : this._todayString(30),
                unitPrice: oRecord ? String(oRecord.unitPrice) : "",
                currency: oRecord ? oRecord.currency : "CNY",
                unit: oRecord ? oRecord.unit : "",
                taxRate: oRecord ? String(oRecord.taxRate) : "",
                remark: oRecord ? oRecord.remark : ""
            };
        },

        _getDialog: function () {
            if (this._oDialog) {
                return this._oDialog;
            }

            this._oDialog = new Dialog({
                contentWidth: "520px",
                stretchOnPhone: true,
                beginButton: new Button({
                    text: this._getText("saveButton"),
                    type: "Emphasized",
                    press: this._onSaveDialog.bind(this)
                }),
                endButton: new Button({
                    text: this._getText("cancelButton"),
                    press: this._onCancelDialog.bind(this)
                })
            });

            this._oDialog.addContent(new SimpleForm({
                editable: true,
                layout: "ResponsiveGridLayout",
                labelSpanL: 4,
                labelSpanM: 4,
                columnsL: 1,
                columnsM: 1,
                content: [
                    new Label({ text: this._getText("priceSupplier"), required: true }),
                    new Select({
                        selectedKey: "{dialog>/supplierId}",
                        forceSelection: false,
                        change: this._onDialogReferenceChange.bind(this),
                        width: "100%",
                        items: {
                            path: "dialog>/supplierOptions",
                            template: new Item({ key: "{dialog>id}", text: "{dialog>name}" })
                        }
                    }),
                    new Label({ text: this._getText("priceMaterial"), required: true }),
                    new Select({
                        selectedKey: "{dialog>/materialId}",
                        forceSelection: false,
                        change: this._onDialogReferenceChange.bind(this),
                        width: "100%",
                        items: {
                            path: "dialog>/materialOptions",
                            template: new Item({ key: "{dialog>id}", text: "{dialog>name}" })
                        }
                    }),
                    new Label({ text: this._getText("priceUnit") }),
                    new Input({ value: "{dialog>/unit}", editable: false }),
                    new Label({ text: this._getText("priceValidFrom"), required: true }),
                    new DatePicker({ value: "{dialog>/validFrom}", valueFormat: "yyyy-MM-dd", displayFormat: "yyyy-MM-dd", width: "100%" }),
                    new Label({ text: this._getText("priceValidTo"), required: true }),
                    new DatePicker({ value: "{dialog>/validTo}", valueFormat: "yyyy-MM-dd", displayFormat: "yyyy-MM-dd", width: "100%" }),
                    new Label({ text: this._getText("priceUnitPrice"), required: true }),
                    new Input({ value: "{dialog>/unitPrice}", type: "Number" }),
                    new Label({ text: this._getText("priceCurrency") }),
                    new Input({ value: "{dialog>/currency}" }),
                    new Label({ text: this._getText("priceTaxRate") }),
                    new Input({ value: "{dialog>/taxRate}", type: "Number" }),
                    new Label({ text: this._getText("priceRemark") }),
                    new Input({ value: "{dialog>/remark}" })
                ]
            }));

            this.getView().addDependent(this._oDialog);
            return this._oDialog;
        },

        _onDialogReferenceChange: function () {
            var oDialogModel = this._getDialog().getModel("dialog");
            this._syncDialogDerivedFields(oDialogModel);
        },

        _syncDialogDerivedFields: function (oDialogModel) {
            if (!oDialogModel) {
                return;
            }

            var oData = oDialogModel.getData();
            var aMaterials = this.getOwnerComponent().getModel("materials").getProperty("/materials") || [];
            var aPriceRecords = this.getView().getModel("priceLibrary").getProperty("/priceRecords") || [];
            var oMaterial = this._findById(aMaterials, oData.materialId);

            oData.unit = oMaterial ? (oMaterial.unit || "") : "";
            oData.taxRate = this._resolveDialogTaxRate(aPriceRecords, oData.supplierId, oData.materialId, oData.taxRate);
            oDialogModel.refresh(true);
        },

        _resolveDialogTaxRate: function (aRecords, sSupplierId, sMaterialId, sCurrentTaxRate) {
            var sFallbackRate = sCurrentTaxRate || "13";
            var aSortedRecords = (aRecords || []).slice().sort(function (a, b) {
                return Date.parse(b.validFrom || "") - Date.parse(a.validFrom || "");
            });

            var oExactMatch = aSortedRecords.find(function (oRecord) {
                return oRecord.supplierId === sSupplierId && oRecord.materialId === sMaterialId;
            });
            if (oExactMatch && oExactMatch.taxRate !== undefined && oExactMatch.taxRate !== null && oExactMatch.taxRate !== "") {
                return String(oExactMatch.taxRate);
            }

            var oMaterialMatch = aSortedRecords.find(function (oRecord) {
                return oRecord.materialId === sMaterialId;
            });
            if (oMaterialMatch && oMaterialMatch.taxRate !== undefined && oMaterialMatch.taxRate !== null && oMaterialMatch.taxRate !== "") {
                return String(oMaterialMatch.taxRate);
            }

            return sMaterialId ? sFallbackRate : "";
        },

        _onSaveDialog: function () {
            var oDialog = this._getDialog();
            var oData = oDialog.getModel("dialog").getData();
            var oPriceModel = this.getView().getModel("priceLibrary");
            var aRecords = oPriceModel.getProperty("/priceRecords") || [];
            var oSupplier = this._findById(this.getOwnerComponent().getModel("suppliers").getProperty("/suppliers"), oData.supplierId);
            var oMaterial = this._findById(this.getOwnerComponent().getModel("materials").getProperty("/materials"), oData.materialId);
            var iUnitPrice = Number(oData.unitPrice);
            var iTaxRate = Number(oData.taxRate || 0);

            if (!oSupplier || !oMaterial || !oData.validFrom || !oData.validTo || !iUnitPrice) {
                MessageToast.show(this._getText("priceRecordFieldsRequired"));
                return;
            }

            if (Date.parse(oData.validFrom) > Date.parse(oData.validTo)) {
                MessageToast.show(this._getText("priceDateRangeInvalid"));
                return;
            }

            var oRecord = {
                id: oData.mode === "add" ? this._createPriceId(aRecords) : oData.id,
                supplierId: oSupplier.id,
                supplierName: oSupplier.name,
                materialId: oMaterial.id,
                materialName: oMaterial.name,
                unit: oMaterial.unit,
                validFrom: oData.validFrom,
                validTo: oData.validTo,
                unitPrice: iUnitPrice,
                currency: oData.currency || "CNY",
                taxRate: iTaxRate,
                remark: oData.remark || ""
            };

            if (oData.mode === "add") {
                aRecords.unshift(oRecord);
            } else {
                var iIndex = parseInt((oData.path || "").split("/").pop(), 10);
                aRecords[iIndex] = oRecord;
            }

            oPriceModel.setProperty("/priceRecords", aRecords);
            this._syncPurchaseOrders();
            oDialog.close();
            MessageToast.show(this._getText("priceRecordSaved"));
        },

        _onCancelDialog: function () {
            this._getDialog().close();
        },

        _syncPurchaseOrders: function () {
            models.annotatePriceLibraryRecords(this.getOwnerComponent().getModel("priceLibrary"));
            models.syncPurchaseOrderPricing(
                this.getOwnerComponent().getModel("purchaseOrders"),
                this.getOwnerComponent().getModel("priceLibrary"),
                this.getOwnerComponent().getModel("suppliers"),
                this.getOwnerComponent().getModel("materials")
            );
        },

        _findById: function (aItems, sId) {
            return (aItems || []).find(function (oItem) {
                return oItem.id === sId;
            }) || null;
        },

        _createPriceId: function (aRecords) {
            var iNext = (aRecords || []).reduce(function (iMax, oRecord) {
                var iCurrent = parseInt(String(oRecord.id || "").replace("PR", ""), 10);
                return Number.isNaN(iCurrent) ? iMax : Math.max(iMax, iCurrent);
            }, 0) + 1;

            return "PR" + String(iNext).padStart(3, "0");
        },

        _todayString: function (iOffsetDays) {
            var oDate = new Date();
            if (iOffsetDays) {
                oDate.setDate(oDate.getDate() + iOffsetDays);
            }
            return oDate.toISOString().slice(0, 10);
        },

        _getText: function (sKey) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey);
        }
    });
});