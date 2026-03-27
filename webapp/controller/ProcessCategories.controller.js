sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "myapp/model/apiClient",
    "myapp/model/processApi"
], function (Controller, JSONModel, MessageToast, MessageBox, apiClient, processApi) {
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
            this._loadFromApi();
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

        _loadFromApi: function () {
            var oProcessModel = this.getView().getModel("process");
            if (!oProcessModel) {
                return;
            }
            processApi.refreshProcessModel(oProcessModel)
                .then(function () {
                    this._syncEditableItemsFromModel();
                }.bind(this))
                .catch(function (oError) {
                    MessageToast.show(apiClient.getErrorMessage(oError, this._getText("loadFailed")));
                }.bind(this));
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
            var oItem = aItems[iIndex];
            MessageBox.confirm(this._getText("processCategoryDeleteConfirm"), {
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.CANCEL,
                onClose: function (sAction) {
                    if (sAction !== MessageBox.Action.OK) {
                        return;
                    }
                    this._deleteById(oItem && oItem.originId);
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
            var sDraftName = (oDraft.name || "").trim();

            if (!sDraftName) {
                MessageToast.show(this._getText("processCategoryRequired"));
                return;
            }

            oDraft.id = (oDraft.id || "").trim();
            oDraft.name = sDraftName;
            oDraft.description = (oDraft.description || "").trim();
            oDraft.owner = (oDraft.owner || "").trim();
            oDraft.originId = (oDraft.originId || "").trim();

            var oPayload = {
                name: oDraft.name,
                description: oDraft.description,
                status: "ACTIVE"
            };

            var pRequest = oDraft.originId
                ? apiClient.request("/api/process/categories/" + encodeURIComponent(oDraft.originId), {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(oPayload)
                })
                : apiClient.request("/api/process/categories", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(oPayload)
                });

            pRequest.then(function () {
                this.byId("processCategoryEditDialog").close();
                MessageToast.show(this._getText("saveSuccess"));
                this._loadFromApi();
            }.bind(this)).catch(function (oError) {
                MessageToast.show(apiClient.getErrorMessage(oError, this._getText("saveFailed")));
            }.bind(this));
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
                    this._deleteById(aItems[iIndex] && aItems[iIndex].originId);
                }.bind(this)
            });
        },

        _deleteById: function (sId) {
            if (!sId) {
                MessageToast.show(this._getText("deleteFailed"));
                return;
            }
            apiClient.request("/api/process/categories/" + encodeURIComponent(sId), {
                method: "DELETE"
            }).then(function () {
                MessageToast.show(this._getText("deleteSuccess"));
                this._loadFromApi();
            }.bind(this)).catch(function (oError) {
                MessageToast.show(apiClient.getErrorMessage(oError, this._getText("deleteFailed")));
            }.bind(this));
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteHome");
        }
    });
});