sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("myapp.controller.DeploymentList", {
        onInit: function () {
            var oModel = this.getOwnerComponent().getModel("process");
            if (oModel) {
                this.getView().setModel(oModel, "process");
            }

            this.getView().setModel(new JSONModel({
                items: [],
                editingIndex: -1,
                editorDraft: this._createEmptyDraft(),
                modelOptions: [],
                environmentOptions: [
                    { key: "生产环境", text: "生产环境" },
                    { key: "测试环境", text: "测试环境" }
                ],
                statusOptions: [
                    { key: "PUBLISHED", text: "发布" },
                    { key: "CANCELLED", text: "取消" }
                ]
            }), "deploymentDisplay");

            this.getOwnerComponent().getRouter().getRoute("RouteProcessDeployments").attachPatternMatched(function () {
                this._refreshEditorOptions();
                this._refreshDeploymentRelations();
            }, this);
            this._refreshEditorOptions();
            this._refreshDeploymentRelations();
        },

        _createEmptyDraft: function () {
            return {
                id: "",
                modelId: "",
                modelName: "",
                formId: "",
                formName: "",
                linkedProcess: "",
                environment: "测试环境",
                scope: "",
                deployTime: "",
                publishedBy: this._getDefaultPublisher(),
                status: "PUBLISHED"
            };
        },


        _getDefaultPublisher: function () {
            var oUsersModel = this.getOwnerComponent().getModel("users");
            var oCurrentUser = oUsersModel ? oUsersModel.getProperty("/currentUser") : null;
            if (oCurrentUser && (oCurrentUser.name || oCurrentUser.username)) {
                return oCurrentUser.name || oCurrentUser.username;
            }
            return "admin";
        },

        _isValidDeployTime: function (sValue) {
            if (!sValue) {
                return true;
            }
            return /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/.test(sValue);
        },

        _getText: function (sKey) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey, Array.prototype.slice.call(arguments, 1));
        },

        _refreshEditorOptions: function () {
            var oProcessModel = this.getView().getModel("process");
            var oDisplayModel = this.getView().getModel("deploymentDisplay");
            var aProcessModels = oProcessModel.getProperty("/processModels") || [];
            oDisplayModel.setProperty("/modelOptions", aProcessModels.map(function (oModelItem) {
                return {
                    key: oModelItem.id,
                    text: (oModelItem.id || "") + " - " + (oModelItem.name || "")
                };
            }));
        },

        _syncDraftByModelId: function () {
            var oProcessModel = this.getView().getModel("process");
            var oDisplayModel = this.getView().getModel("deploymentDisplay");
            var oDraft = Object.assign({}, oDisplayModel.getProperty("/editorDraft") || this._createEmptyDraft());
            var aProcessModels = oProcessModel.getProperty("/processModels") || [];
            var aForms = oProcessModel.getProperty("/formConfigs") || [];
            var oLinkedModel = aProcessModels.find(function (oModelItem) {
                return oModelItem.id === oDraft.modelId;
            }) || null;
            var oLinkedForm = oLinkedModel ? (aForms.find(function (oForm) {
                return oForm.id === oLinkedModel.formId;
            }) || null) : null;

            oDraft.modelName = oLinkedModel ? (oLinkedModel.name || "") : "";
            oDraft.formId = oLinkedForm ? (oLinkedForm.id || "") : "";
            oDraft.formName = oLinkedForm ? (oLinkedForm.name || "") : "";
            oDraft.linkedProcess = oLinkedModel ? (oLinkedModel.categoryName || "") : "";
            oDisplayModel.setProperty("/editorDraft", oDraft);
        },

        _refreshDeploymentRelations: function () {
            var oProcessModel = this.getView().getModel("process");
            var oDisplayModel = this.getView().getModel("deploymentDisplay");
            var aDeployments = oProcessModel.getProperty("/deployments") || [];
            var aProcessModels = oProcessModel.getProperty("/processModels") || [];
            var aForms = oProcessModel.getProperty("/formConfigs") || [];
            var mProcessModelById = {};
            var mFormById = {};

            aProcessModels.forEach(function (oModelItem) {
                mProcessModelById[oModelItem.id] = oModelItem;
            });
            aForms.forEach(function (oForm) {
                mFormById[oForm.id] = oForm;
            });

            var aNormalized = aDeployments.map(function (oDeployment) {
                var oLinkedModel = null;
                if (oDeployment.modelId && mProcessModelById[oDeployment.modelId]) {
                    oLinkedModel = mProcessModelById[oDeployment.modelId];
                } else if (oDeployment.modelName) {
                    oLinkedModel = aProcessModels.find(function (oModelItem) {
                        return oModelItem.name === oDeployment.modelName;
                    }) || null;
                }

                var oLinkedForm = null;
                if (oLinkedModel && oLinkedModel.formId) {
                    oLinkedForm = mFormById[oLinkedModel.formId] || null;
                } else if (oDeployment.formId) {
                    oLinkedForm = mFormById[oDeployment.formId] || null;
                }

                var bModelLinked = !!oLinkedModel;
                return Object.assign({}, oDeployment, {
                    modelId: oLinkedModel ? oLinkedModel.id : (oDeployment.modelId || ""),
                    modelName: oLinkedModel ? oLinkedModel.name : (oDeployment.modelName || this._getText("deploymentModelMissing")),
                    formId: oLinkedForm ? oLinkedForm.id : (oDeployment.formId || ""),
                    formName: oLinkedForm ? oLinkedForm.name : (oDeployment.formName || ""),
                    linkedProcess: oLinkedModel ? (oLinkedModel.categoryName || "") : (oDeployment.linkedProcess || oDeployment.scope || ""),
                    status: (oDeployment.status || "PUBLISHED"),
                    linkState: bModelLinked ? "Success" : "Error",
                    linkText: bModelLinked ? this._getText("deploymentLinkHealthy") : this._getText("deploymentLinkBroken")
                });
            }, this);

            oDisplayModel.setProperty("/items", aNormalized);
            oProcessModel.setProperty("/deployments", aNormalized);
            oProcessModel.refresh(true);
        },

        onAddDeployment: function () {
            var oDisplayModel = this.getView().getModel("deploymentDisplay");
            this._refreshEditorOptions();
            oDisplayModel.setProperty("/editingIndex", -1);
            oDisplayModel.setProperty("/editorDraft", this._createEmptyDraft());
            this.byId("deploymentEditDialog").open();
        },

        _getSelectedItemIndex: function () {
            var oTable = this.byId("deploymentTable");
            var oSelectedItem = oTable && oTable.getSelectedItem();
            if (!oSelectedItem) {
                return -1;
            }
            var oCtx = oSelectedItem.getBindingContext("deploymentDisplay");
            return oCtx ? parseInt(oCtx.getPath().split("/").pop(), 10) : -1;
        },

        onEditSelected: function () {
            var iIndex = this._getSelectedItemIndex();
            if (isNaN(iIndex) || iIndex < 0) {
                MessageToast.show(this._getText("processModelSelectOne"));
                return;
            }

            var oDisplayModel = this.getView().getModel("deploymentDisplay");
            var aItems = oDisplayModel.getProperty("/items") || [];
            var oItem = aItems[iIndex] || this._createEmptyDraft();
            this._refreshEditorOptions();
            oDisplayModel.setProperty("/editingIndex", iIndex);
            oDisplayModel.setProperty("/editorDraft", Object.assign({}, oItem));
            if (!oDisplayModel.getProperty("/editorDraft/publishedBy")) {
                oDisplayModel.setProperty("/editorDraft/publishedBy", this._getDefaultPublisher());
            }
            this.byId("deploymentEditDialog").open();
        },

        onDeleteSelected: function () {
            var iIndex = this._getSelectedItemIndex();
            if (isNaN(iIndex) || iIndex < 0) {
                MessageToast.show(this._getText("processModelSelectOne"));
                return;
            }

            var oDisplayModel = this.getView().getModel("deploymentDisplay");
            var aItems = oDisplayModel.getProperty("/items") || [];
            MessageBox.confirm(this._getText("deploymentDeleteConfirm"), {
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.CANCEL,
                onClose: function (sAction) {
                    if (sAction !== MessageBox.Action.OK) {
                        return;
                    }
                    aItems.splice(iIndex, 1);
                    oDisplayModel.setProperty("/items", aItems);
                    MessageToast.show(this._getText("deleteSuccess"));
                }.bind(this)
            });
        },

        onOpenDeploymentEditor: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("deploymentDisplay");
            if (!oContext) {
                return;
            }
            var iIndex = parseInt(oContext.getPath().split("/").pop(), 10);
            if (isNaN(iIndex) || iIndex < 0) {
                return;
            }
            var oDisplayModel = this.getView().getModel("deploymentDisplay");
            var aItems = oDisplayModel.getProperty("/items") || [];
            var oItem = aItems[iIndex] || this._createEmptyDraft();
            this._refreshEditorOptions();
            oDisplayModel.setProperty("/editingIndex", iIndex);
            oDisplayModel.setProperty("/editorDraft", Object.assign({}, oItem));
            if (!oDisplayModel.getProperty("/editorDraft/publishedBy")) {
                oDisplayModel.setProperty("/editorDraft/publishedBy", this._getDefaultPublisher());
            }
            this.byId("deploymentEditDialog").open();
        },

        onDeploymentModelChanged: function () {
            this._syncDraftByModelId();
        },

        onSaveDeploymentDraft: function () {
            var oDisplayModel = this.getView().getModel("deploymentDisplay");
            var aItems = oDisplayModel.getProperty("/items") || [];
            var iEditingIndex = oDisplayModel.getProperty("/editingIndex");
            var oDraft = Object.assign({}, oDisplayModel.getProperty("/editorDraft") || this._createEmptyDraft());
            var sDraftId = (oDraft.id || "").trim();
            oDraft.modelId = (oDraft.modelId || "").trim();

            if (!sDraftId || !oDraft.modelId) {
                MessageToast.show(this._getText("deploymentRequired"));
                return;
            }

            var bDuplicateId = aItems.some(function (oItem, iIndex) {
                if (iEditingIndex >= 0 && iIndex === iEditingIndex) {
                    return false;
                }
                return ((oItem.id || "").trim().toUpperCase() === sDraftId.toUpperCase());
            });
            if (bDuplicateId) {
                MessageToast.show(this._getText("deploymentIdDuplicate"));
                return;
            }

            oDisplayModel.setProperty("/editorDraft", oDraft);
            this._syncDraftByModelId();
            oDraft = Object.assign({}, oDisplayModel.getProperty("/editorDraft") || this._createEmptyDraft());
            oDraft.id = sDraftId;
            oDraft.environment = (oDraft.environment || "").trim();
            oDraft.linkedProcess = (oDraft.linkedProcess || "").trim();
            oDraft.scope = (oDraft.scope || oDraft.linkedProcess || "").trim();
            oDraft.deployTime = (oDraft.deployTime || "").trim();
            oDraft.publishedBy = (oDraft.publishedBy || this._getDefaultPublisher()).trim();
            oDraft.status = (oDraft.status || "PUBLISHED").trim();

            if (!this._isValidDeployTime(oDraft.deployTime)) {
                MessageToast.show(this._getText("deploymentTimeInvalid"));
                return;
            }

            if (iEditingIndex >= 0) {
                aItems[iEditingIndex] = oDraft;
            } else {
                aItems.push(oDraft);
            }
            oDisplayModel.setProperty("/items", aItems);
            this.byId("deploymentEditDialog").close();
        },

        onCancelDeploymentDraft: function () {
            this.byId("deploymentEditDialog").close();
        },

        onDeleteDeployment: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("deploymentDisplay");
            if (!oContext) {
                return;
            }
            var iIndex = parseInt(oContext.getPath().split("/").pop(), 10);
            var oDisplayModel = this.getView().getModel("deploymentDisplay");
            var aItems = oDisplayModel.getProperty("/items") || [];
            if (isNaN(iIndex) || iIndex < 0) {
                return;
            }

            MessageBox.confirm(this._getText("deploymentDeleteConfirm"), {
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.CANCEL,
                onClose: function (sAction) {
                    if (sAction !== MessageBox.Action.OK) {
                        return;
                    }
                    aItems.splice(iIndex, 1);
                    oDisplayModel.setProperty("/items", aItems);
                    MessageToast.show(this._getText("deleteSuccess"));
                }.bind(this)
            });
        },

        onSave: function () {
            var oProcessModel = this.getView().getModel("process");
            var oDisplayModel = this.getView().getModel("deploymentDisplay");
            var aItems = oDisplayModel.getProperty("/items") || [];

            if (!aItems.length) {
                MessageToast.show(this._getText("deploymentRequired"));
                return;
            }

            var aSavedDeployments = aItems.map(function (oItem) {
                return {
                    id: (oItem.id || "").trim(),
                    modelId: (oItem.modelId || "").trim(),
                    modelName: (oItem.modelName || "").trim(),
                    formId: (oItem.formId || "").trim(),
                    formName: (oItem.formName || "").trim(),
                    linkedProcess: (oItem.linkedProcess || "").trim(),
                    environment: (oItem.environment || "").trim(),
                    scope: (oItem.scope || "").trim(),
                    deployTime: (oItem.deployTime || "").trim(),
                    publishedBy: (oItem.publishedBy || "").trim(),
                    status: (oItem.status || "PUBLISHED").trim()
                };
            }, this);

            oProcessModel.setProperty("/deployments", aSavedDeployments);
            this._refreshDeploymentRelations();
            MessageToast.show(this._getText("saveSuccess"));
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteHome");
        }
    });
});