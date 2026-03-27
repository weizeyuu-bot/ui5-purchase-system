sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("myapp.controller.ProcessCategories", {
        onInit: function () {
            var oModel = this.getOwnerComponent().getModel("process");
            if (oModel) {
                this.getView().setModel(oModel, "process");
            }
            this.getView().setModel(new JSONModel({
                items: [],
                editingIndex: -1,
                editorDraft: this._createEmptyDraft()
            }), "processCategoryVM");
            this._syncEditableItemsFromModel();
        },

        _createEmptyDraft: function () {
            return {
                originId: "",
                id: "",
                name: "",
                description: "",
                owner: ""
            };
        },

        _getText: function (sKey) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey, Array.prototype.slice.call(arguments, 1));
        },

        _syncEditableItemsFromModel: function () {
            var oProcessModel = this.getView().getModel("process");
            var oVM = this.getView().getModel("processCategoryVM");
            var aSource = oProcessModel ? (oProcessModel.getProperty("/processCategories") || []) : [];

            oVM.setProperty("/items", aSource.map(function (oItem) {
                return {
                    originId: oItem.id || "",
                    id: oItem.id || "",
                    name: oItem.name || "",
                    description: oItem.description || "",
                    owner: oItem.owner || ""
                };
            }));
        },

        _getSelectedItemIndex: function () {
            var oTable = this.byId("processCategoryTable");
            var oSelectedItem = oTable && oTable.getSelectedItem();
            if (!oSelectedItem) {
                return -1;
            }
            var oCtx = oSelectedItem.getBindingContext("processCategoryVM");
            return oCtx ? parseInt(oCtx.getPath().split("/").pop(), 10) : -1;
        },

        onEditSelected: function () {
            var iIndex = this._getSelectedItemIndex();
            if (isNaN(iIndex) || iIndex < 0) {
                MessageToast.show(this._getText("processModelSelectOne"));
                return;
            }

            var oVM = this.getView().getModel("processCategoryVM");
            var aItems = oVM.getProperty("/items") || [];
            var oItem = aItems[iIndex] || this._createEmptyDraft();
            oVM.setProperty("/editingIndex", iIndex);
            oVM.setProperty("/editorDraft", Object.assign({}, oItem));
            this.byId("processCategoryEditDialog").open();
        },

        onDeleteSelected: function () {
            var iIndex = this._getSelectedItemIndex();
            if (isNaN(iIndex) || iIndex < 0) {
                MessageToast.show(this._getText("processModelSelectOne"));
                return;
            }

            var oVM = this.getView().getModel("processCategoryVM");
            var aItems = oVM.getProperty("/items") || [];
            MessageBox.confirm(this._getText("processCategoryDeleteConfirm"), {
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.CANCEL,
                onClose: function (sAction) {
                    if (sAction !== MessageBox.Action.OK) {
                        return;
                    }
                    aItems.splice(iIndex, 1);
                    oVM.setProperty("/items", aItems);
                    MessageToast.show(this._getText("deleteSuccess"));
                }.bind(this)
            });
        },

        onAddProcessCategory: function () {
            var oVM = this.getView().getModel("processCategoryVM");
            oVM.setProperty("/editingIndex", -1);
            oVM.setProperty("/editorDraft", this._createEmptyDraft());
            this.byId("processCategoryEditDialog").open();
        },

        onOpenProcessCategoryEditor: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("processCategoryVM");
            if (!oContext) {
                return;
            }
            var iIndex = parseInt(oContext.getPath().split("/").pop(), 10);
            if (isNaN(iIndex) || iIndex < 0) {
                return;
            }

            var oVM = this.getView().getModel("processCategoryVM");
            var aItems = oVM.getProperty("/items") || [];
            var oItem = aItems[iIndex] || this._createEmptyDraft();
            oVM.setProperty("/editingIndex", iIndex);
            oVM.setProperty("/editorDraft", Object.assign({}, oItem));
            this.byId("processCategoryEditDialog").open();
        },

        onSaveProcessCategoryDraft: function () {
            var oVM = this.getView().getModel("processCategoryVM");
            var aItems = oVM.getProperty("/items") || [];
            var iEditingIndex = oVM.getProperty("/editingIndex");
            var oDraft = Object.assign({}, oVM.getProperty("/editorDraft") || this._createEmptyDraft());
            var sDraftId = (oDraft.id || "").trim();
            var sDraftName = (oDraft.name || "").trim();

            if (!sDraftId || !sDraftName) {
                MessageToast.show(this._getText("processCategoryRequired"));
                return;
            }

            var bDuplicateId = aItems.some(function (oItem, iIndex) {
                if (iEditingIndex >= 0 && iIndex === iEditingIndex) {
                    return false;
                }
                return ((oItem.id || "").trim().toUpperCase() === sDraftId.toUpperCase());
            });
            if (bDuplicateId) {
                MessageToast.show(this._getText("processCategoryIdDuplicate"));
                return;
            }

            oDraft.id = sDraftId;
            oDraft.name = sDraftName;
            oDraft.description = (oDraft.description || "").trim();
            oDraft.owner = (oDraft.owner || "").trim();
            oDraft.originId = (oDraft.originId || sDraftId).trim();

            if (iEditingIndex >= 0) {
                aItems[iEditingIndex] = oDraft;
            } else {
                aItems.push(oDraft);
            }
            oVM.setProperty("/items", aItems);
            this.byId("processCategoryEditDialog").close();
        },

        onCancelProcessCategoryDraft: function () {
            this.byId("processCategoryEditDialog").close();
        },

        onDeleteProcessCategory: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("processCategoryVM");
            if (!oContext) {
                return;
            }
            var iIndex = parseInt(oContext.getPath().split("/").pop(), 10);
            var oVM = this.getView().getModel("processCategoryVM");
            var aItems = oVM.getProperty("/items") || [];
            if (isNaN(iIndex) || iIndex < 0) {
                return;
            }
            MessageBox.confirm(this._getText("processCategoryDeleteConfirm"), {
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.CANCEL,
                onClose: function (sAction) {
                    if (sAction !== MessageBox.Action.OK) {
                        return;
                    }
                    aItems.splice(iIndex, 1);
                    oVM.setProperty("/items", aItems);
                    MessageToast.show(this._getText("deleteSuccess"));
                }.bind(this)
            });
        },

        onSave: function () {
            var oVM = this.getView().getModel("processCategoryVM");
            var oProcessModel = this.getView().getModel("process");
            var aItems = oVM.getProperty("/items") || [];

            var aSavedCategories = aItems.map(function (oItem) {
                return {
                    id: (oItem.id || "").trim(),
                    name: (oItem.name || "").trim(),
                    description: (oItem.description || "").trim(),
                    owner: (oItem.owner || "").trim()
                };
            });

            oProcessModel.setProperty("/processCategories", aSavedCategories);
            oProcessModel.refresh(true);
            this._syncEditableItemsFromModel();
            MessageToast.show(this._getText("saveSuccess"));
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteHome");
        }
    });
});