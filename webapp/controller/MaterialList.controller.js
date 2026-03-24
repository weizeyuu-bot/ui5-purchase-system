sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
], function (Controller, Filter, FilterOperator, JSONModel, MessageBox) {
    "use strict";

    return Controller.extend("myapp.controller.MaterialList", {

        onInit: function () {
            this._oNewMaterial = {};
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteHome");
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("query");
            var oTable = this.getView().byId("materialTable");
            var oBinding = oTable.getBinding("items");

            if (sQuery) {
                var aFilters = [
                    new Filter("name", FilterOperator.Contains, sQuery),
                    new Filter("id", FilterOperator.Contains, sQuery)
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
            var sPath = oEvent.getSource().getBindingContext("materials").getPath();
            var sMaterialId = this.getView().getModel("materials").getProperty(sPath + "/id");
            this.getOwnerComponent().getRouter().navTo("RouteMaterialDetail", {
                materialId: sMaterialId
            });
        },

        onViewPress: function (oEvent) {
            var oButton = oEvent.getSource();
            var oItem = oButton.getParent().getParent();
            var sPath = oItem.getBindingContext("materials").getPath();
            var sMaterialId = this.getView().getModel("materials").getProperty(sPath + "/id");
            this.getOwnerComponent().getRouter().navTo("RouteMaterialDetail", {
                materialId: sMaterialId
            });
        },

        onEditPress: function (oEvent) {
            var oButton = oEvent.getSource();
            var oItem = oButton.getParent().getParent();
            var sPath = oItem.getBindingContext("materials").getPath();
            var oMaterial = this.getView().getModel("materials").getProperty(sPath);
            this._oNewMaterial = jQuery.extend({}, oMaterial);
            var oModel = new JSONModel(this._oNewMaterial);
            this.getView().setModel(oModel, "oNewMaterial");
            this._bIsEdit = true;
            this._iEditIndex = parseInt(sPath.split("/").pop(), 10);
            this.getView().byId("materialDialog").open();
        },

        onAdd: function () {
            this._oNewMaterial = { name: "", spec: "", unit: "", stock: 0 };
            var oModel = new JSONModel(this._oNewMaterial);
            this.getView().setModel(oModel, "oNewMaterial");
            this._bIsEdit = false;
            this.getView().byId("materialDialog").open();
        },

        onDialogSave: function () {
            // 验证必填项
            var sName = this.getView().byId("materialNameInput").getValue().trim();

            if (!sName) {
                MessageBox.error(this._getText("materialNameRequired"));
                return;
            }

            var oMaterialModel = this.getView().getModel("materials");
            var aMaterials = oMaterialModel.getProperty("/materials");

            if (this._bIsEdit) {
                aMaterials[this._iEditIndex] = this._oNewMaterial;
            } else {
                var sNewId = "MAT" + (new Date()).getTime();
                this._oNewMaterial.id = sNewId;
                aMaterials.unshift(this._oNewMaterial);
            }

            oMaterialModel.setProperty("/materials", aMaterials);
            this.getView().byId("materialDialog").close();
        },

        onDialogCancel: function () {
            this.getView().byId("materialDialog").close();
        },

        onDeletePress: function (oEvent) {
            var oButton = oEvent.getSource();
            var oItem = oButton.getParent().getParent();
            var sPath = oItem.getBindingContext("materials").getPath();
            var oModel = this.getView().getModel("materials");
            var aMaterials = oModel.getProperty("/materials");
            var iIndex = parseInt(sPath.split("/").pop(), 10);
            aMaterials.splice(iIndex, 1);
            oModel.setProperty("/materials", aMaterials);
        },

        _getText: function (sKey) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey);
        }
    });
});