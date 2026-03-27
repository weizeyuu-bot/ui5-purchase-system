sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "myapp/model/apiClient",
    "myapp/model/processApi"
], function (Controller, JSONModel, MessageToast, MessageBox, apiClient, processApi) {
    "use strict";

    return Controller.extend("myapp.controller.FormConfig", {
        onInit: function () {
            var oModel = this.getOwnerComponent().getModel("process");
            if (oModel) {
                this.getView().setModel(oModel, "process");
            }
            this.getView().setModel(new JSONModel({
                items: [],
                editingIndex: -1,
                editorDraft: this._createEmptyDraft(),
                categoryOptions: [],
                businessObjectOptions: [],
                roleOptions: []
            }), "formConfigVM");
            this._loadFromApi();
            this._sSavedSnapshot = this._getCurrentEditableSnapshot();
            this._initComboBoxFuzzyFilter();
        },

        _loadFromApi: function () {
            var oProcessModel = this.getView().getModel("process");
            if (!oProcessModel) {
                return;
            }
            processApi.refreshProcessModel(oProcessModel)
                .then(function () {
                    this._syncEditableItemsFromModel();
                    this._refreshEditorOptions();
                    this._sSavedSnapshot = this._getCurrentEditableSnapshot();
                }.bind(this))
                .catch(function (oError) {
                    MessageToast.show(apiClient.getErrorMessage(oError, this._getText("loadFailed")));
                }.bind(this));
        },

        _createEmptyDraft: function () {
            return {
                originId: "",
                id: "",
                name: "",
                categoryId: "",
                categoryName: "",
                businessObject: "",
                initiatorRole: "",
                approverRole: "",
                fieldsText: ""
            };
        },

        _getText: function (sKey) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey, Array.prototype.slice.call(arguments, 1));
        },

        _syncEditableItemsFromModel: function () {
            var oProcessModel = this.getView().getModel("process");
            var oVM = this.getView().getModel("formConfigVM");
            var aSource = oProcessModel ? (oProcessModel.getProperty("/formConfigs") || []) : [];
            var aCategories = oProcessModel ? (oProcessModel.getProperty("/processCategories") || []) : [];
            var mCategoryNameById = {};

            aCategories.forEach(function (oCategory) {
                if (oCategory && oCategory.id) {
                    mCategoryNameById[oCategory.id] = oCategory.name || oCategory.id;
                }
            });

            oVM.setProperty("/items", aSource.map(function (oItem) {
                var sCategoryId = oItem.categoryId || "";
                var sCategoryName = oItem.categoryName || (sCategoryId ? (mCategoryNameById[sCategoryId] || "") : "");
                return {
                    originId: oItem.id || "",
                    id: oItem.id || "",
                    name: oItem.name || "",
                    categoryId: sCategoryId,
                    categoryName: sCategoryName,
                    businessObject: oItem.businessObject || "",
                    initiatorRole: oItem.initiatorRole || "",
                    approverRole: oItem.approverRole || "",
                    fieldsText: Array.isArray(oItem.fields) ? oItem.fields.join(", ") : ""
                };
            }));
        },

        _refreshEditorOptions: function () {
            var oVM = this.getView().getModel("formConfigVM");
            var oProcessModel = this.getView().getModel("process");
            var oUsersModel = this.getOwnerComponent().getModel("users");
            var aCategories = oProcessModel ? (oProcessModel.getProperty("/processCategories") || []) : [];
            var aFormConfigs = oProcessModel ? (oProcessModel.getProperty("/formConfigs") || []) : [];
            var aProcessModels = oProcessModel ? (oProcessModel.getProperty("/processModels") || []) : [];
            var aRoles = oUsersModel ? (oUsersModel.getProperty("/roles") || []) : [];
            var mBusinessObject = {};
            var mRole = {};

            aFormConfigs.forEach(function (oForm) {
                var sBusinessObject = (oForm.businessObject || "").trim();
                if (sBusinessObject) {
                    mBusinessObject[sBusinessObject] = true;
                }
                var sInitiator = (oForm.initiatorRole || "").trim();
                var sApprover = (oForm.approverRole || "").trim();
                if (sInitiator) {
                    mRole[sInitiator] = true;
                }
                if (sApprover) {
                    mRole[sApprover] = true;
                }
            });

            aProcessModels.forEach(function (oProcess) {
                var sBusinessObject = (oProcess.businessObject || "").trim();
                if (sBusinessObject) {
                    mBusinessObject[sBusinessObject] = true;
                }
            });

            aRoles.forEach(function (oRole) {
                var sRoleName = (oRole.name || "").trim();
                if (sRoleName) {
                    mRole[sRoleName] = true;
                }
            });

            oVM.setProperty("/categoryOptions", aCategories.map(function (oCategory) {
                return {
                    key: oCategory.id || "",
                    text: oCategory.name || oCategory.id || ""
                };
            }).filter(function (oItem) {
                return !!oItem.key;
            }));

            oVM.setProperty("/businessObjectOptions", Object.keys(mBusinessObject).sort().map(function (sText) {
                return { key: sText, text: sText };
            }));
            oVM.setProperty("/roleOptions", Object.keys(mRole).sort().map(function (sText) {
                return { key: sText, text: sText };
            }));
        },

        _initComboBoxFuzzyFilter: function () {
            var fnContainsFilter = function (sTerm, oItem) {
                if (!sTerm) {
                    return true;
                }
                var sText = (oItem && oItem.getText ? oItem.getText() : "") || "";
                return sText.toLowerCase().indexOf(String(sTerm).toLowerCase()) !== -1;
            };

            ["formProcessCategoryCombo", "formBusinessObjectCombo", "formInitiatorRoleCombo", "formApproverRoleCombo"].forEach(function (sId) {
                var oComboBox = this.byId(sId);
                if (oComboBox && oComboBox.setFilterFunction) {
                    oComboBox.setFilterFunction(fnContainsFilter);
                }
            }.bind(this));
        },

        _normalizeItemsForCompare: function (aItems) {
            return (aItems || []).map(function (oItem) {
                return {
                    originId: (oItem.originId || "").trim(),
                    id: (oItem.id || "").trim(),
                    name: (oItem.name || "").trim(),
                    categoryId: (oItem.categoryId || "").trim(),
                    categoryName: (oItem.categoryName || "").trim(),
                    businessObject: (oItem.businessObject || "").trim(),
                    initiatorRole: (oItem.initiatorRole || "").trim(),
                    approverRole: (oItem.approverRole || "").trim(),
                    fieldsText: (oItem.fieldsText || "").split(/[，,]/).map(function (sField) {
                        return sField.trim();
                    }).filter(function (sField) {
                        return !!sField;
                    }).join(",")
                };
            });
        },

        _getCurrentEditableSnapshot: function () {
            var oVM = this.getView().getModel("formConfigVM");
            var aItems = oVM ? (oVM.getProperty("/items") || []) : [];
            return JSON.stringify(this._normalizeItemsForCompare(aItems));
        },

        _getSelectedItemIndex: function () {
            var oTable = this.byId("formConfigTable");
            var oSelectedItem = oTable && oTable.getSelectedItem();
            if (!oSelectedItem) {
                return -1;
            }
            var oCtx = oSelectedItem.getBindingContext("formConfigVM");
            return oCtx ? parseInt(oCtx.getPath().split("/").pop(), 10) : -1;
        },

        onEditSelected: function () {
            var iIndex = this._getSelectedItemIndex();
            if (isNaN(iIndex) || iIndex < 0) {
                MessageToast.show(this._getText("processModelSelectOne"));
                return;
            }

            var oVM = this.getView().getModel("formConfigVM");
            var aItems = oVM.getProperty("/items") || [];
            var oItem = aItems[iIndex] || this._createEmptyDraft();
            this._refreshEditorOptions();
            oVM.setProperty("/editingIndex", iIndex);
            oVM.setProperty("/editorDraft", Object.assign({}, oItem));
            this.byId("formConfigEditDialog").open();
        },

        onDeleteSelected: function () {
            var iIndex = this._getSelectedItemIndex();
            if (isNaN(iIndex) || iIndex < 0) {
                MessageToast.show(this._getText("processModelSelectOne"));
                return;
            }

            var oVM = this.getView().getModel("formConfigVM");
            var aItems = oVM.getProperty("/items") || [];
            var oItem = aItems[iIndex];
            MessageBox.confirm(this._getText("formConfigDeleteConfirm"), {
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.CANCEL,
                onClose: function (sAction) {
                    if (sAction !== MessageBox.Action.OK) {
                        return;
                    }
                    this._deleteFormById(oItem && oItem.originId);
                }
                .bind(this)
            });
        },

        _hasUnsavedChanges: function () {
            return this._getCurrentEditableSnapshot() !== (this._sSavedSnapshot || "[]");
        },

        onAddFormConfig: function () {
            var oVM = this.getView().getModel("formConfigVM");
            this._refreshEditorOptions();
            oVM.setProperty("/editingIndex", -1);
            oVM.setProperty("/editorDraft", this._createEmptyDraft());
            this.byId("formConfigEditDialog").open();
        },

        onOpenFormConfigEditor: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("formConfigVM");
            if (!oContext) {
                return;
            }
            var iIndex = parseInt(oContext.getPath().split("/").pop(), 10);
            if (isNaN(iIndex) || iIndex < 0) {
                return;
            }

            var oVM = this.getView().getModel("formConfigVM");
            var aItems = oVM.getProperty("/items") || [];
            var oItem = aItems[iIndex] || this._createEmptyDraft();
            this._refreshEditorOptions();
            oVM.setProperty("/editingIndex", iIndex);
            oVM.setProperty("/editorDraft", Object.assign({}, oItem));
            this.byId("formConfigEditDialog").open();
        },

        onSaveFormConfigDraft: function () {
            var oVM = this.getView().getModel("formConfigVM");
            var oDraft = Object.assign({}, oVM.getProperty("/editorDraft") || this._createEmptyDraft());
            var sDraftName = (oDraft.name || "").trim();

            if (!sDraftName || !oDraft.categoryId) {
                MessageToast.show(this._getText("formConfigRequired"));
                return;
            }

            oDraft.name = sDraftName;
            oDraft.categoryId = (oDraft.categoryId || "").trim();
            oDraft.categoryName = "";
            if (oDraft.categoryId) {
                var aCategoryOptions = oVM.getProperty("/categoryOptions") || [];
                var oMatchedCategory = aCategoryOptions.find(function (oItem) {
                    return oItem.key === oDraft.categoryId;
                });
                oDraft.categoryName = oMatchedCategory ? (oMatchedCategory.text || "") : "";
            }
            oDraft.businessObject = (oDraft.businessObject || "").trim();
            oDraft.initiatorRole = (oDraft.initiatorRole || "").trim();
            oDraft.approverRole = (oDraft.approverRole || "").trim();
            oDraft.fieldsText = (oDraft.fieldsText || "").trim();

            var oPayload = {
                name: oDraft.name,
                categoryId: oDraft.categoryId,
                schemaJson: processApi.buildFormSchemaJson(oDraft),
                status: "ACTIVE"
            };

            var pRequest = oDraft.originId
                ? apiClient.request("/api/process/forms/" + encodeURIComponent(oDraft.originId), {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(oPayload)
                })
                : apiClient.request("/api/process/forms", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(oPayload)
                });

            pRequest.then(function () {
                this.byId("formConfigEditDialog").close();
                MessageToast.show(this._getText("saveSuccess"));
                this._loadFromApi();
            }.bind(this)).catch(function (oError) {
                MessageToast.show(apiClient.getErrorMessage(oError, this._getText("saveFailed")));
            }.bind(this));
        },

        onCancelFormConfigDraft: function () {
            this.byId("formConfigEditDialog").close();
        },

        _applyFormConfigSave: function (aItems, bAllowClearLinkedProcessModel) {
            var oProcessModel = this.getView().getModel("process");
            var aOldFormConfigs = oProcessModel.getProperty("/formConfigs") || [];
            var aProcessModels = oProcessModel.getProperty("/processModels") || [];
            var aDeployments = oProcessModel.getProperty("/deployments") || [];
            var aProcessCategories = oProcessModel.getProperty("/processCategories") || [];
            var mNewById = {};
            var mRenamedByOldId = {};
            var mCategoryNameById = {};

            aProcessCategories.forEach(function (oCategory) {
                if (oCategory && oCategory.id) {
                    mCategoryNameById[oCategory.id] = oCategory.name || oCategory.id;
                }
            });

            var aSavedFormConfigs = aItems.map(function (oItem) {
                var sNewId = (oItem.id || "").trim();
                var sOriginId = (oItem.originId || "").trim();
                var sCategoryId = (oItem.categoryId || "").trim();
                var aFields = (oItem.fieldsText || "")
                    .split(/[，,]/)
                    .map(function (sField) { return sField.trim(); })
                    .filter(function (sField) { return !!sField; });
                var oSaved = {
                    id: sNewId,
                    name: (oItem.name || "").trim(),
                    categoryId: sCategoryId,
                    categoryName: sCategoryId ? (mCategoryNameById[sCategoryId] || "") : "",
                    businessObject: (oItem.businessObject || "").trim(),
                    initiatorRole: (oItem.initiatorRole || "").trim(),
                    approverRole: (oItem.approverRole || "").trim(),
                    fields: aFields
                };
                mNewById[oSaved.id] = oSaved;
                if (sOriginId && sOriginId !== sNewId) {
                    mRenamedByOldId[sOriginId] = sNewId;
                }
                return oSaved;
            });

            var mOldById = {};
            aOldFormConfigs.forEach(function (oForm) {
                mOldById[oForm.id] = oForm;
            });

            var aImpactedModelNames = [];
            var aUpdatedProcessModels = aProcessModels.map(function (oModelItem) {
                var sCurrentFormId = oModelItem.formId || "";
                var sMappedFormId = mRenamedByOldId[sCurrentFormId] || sCurrentFormId;
                var oMappedForm = mNewById[sMappedFormId];
                var oNext = Object.assign({}, oModelItem);

                if (oMappedForm) {
                    oNext.formId = oMappedForm.id;
                    oNext.formName = oMappedForm.name;
                    if (oMappedForm.categoryName) {
                        oNext.categoryName = oMappedForm.categoryName;
                    }
                    return oNext;
                }

                if (sCurrentFormId && mOldById[sCurrentFormId]) {
                    aImpactedModelNames.push(oModelItem.name || oModelItem.id || "-");
                    if (bAllowClearLinkedProcessModel) {
                        oNext.formId = "";
                        oNext.formName = "";
                    }
                }
                return oNext;
            });

            if (aImpactedModelNames.length && !bAllowClearLinkedProcessModel) {
                return {
                    ok: false,
                    impactedModelNames: aImpactedModelNames
                };
            }

            var mProcessModelById = {};
            aUpdatedProcessModels.forEach(function (oModelItem) {
                mProcessModelById[oModelItem.id] = oModelItem;
            });

            var aUpdatedDeployments = aDeployments.map(function (oDeployment) {
                var oLinkedModel = null;
                if (oDeployment.modelId && mProcessModelById[oDeployment.modelId]) {
                    oLinkedModel = mProcessModelById[oDeployment.modelId];
                } else if (oDeployment.modelName) {
                    oLinkedModel = aUpdatedProcessModels.find(function (oModelItem) {
                        return oModelItem.name === oDeployment.modelName;
                    }) || null;
                }

                if (!oLinkedModel) {
                    return oDeployment;
                }

                var oLinkedForm = mNewById[oLinkedModel.formId] || null;
                return Object.assign({}, oDeployment, {
                    modelId: oLinkedModel.id,
                    modelName: oLinkedModel.name,
                    formId: oLinkedForm ? oLinkedForm.id : "",
                    formName: oLinkedForm ? oLinkedForm.name : ""
                });
            });

            oProcessModel.setProperty("/formConfigs", aSavedFormConfigs);
            oProcessModel.setProperty("/processModels", aUpdatedProcessModels);
            oProcessModel.setProperty("/deployments", aUpdatedDeployments);
            oProcessModel.refresh(true);
            this._syncEditableItemsFromModel();
            this._sSavedSnapshot = this._getCurrentEditableSnapshot();
            MessageToast.show(this._getText("saveSuccess"));

            return { ok: true };
        },

        onDeleteFormConfig: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("formConfigVM");
            if (!oContext) {
                return;
            }
            var iIndex = parseInt(oContext.getPath().split("/").pop(), 10);
            var oVM = this.getView().getModel("formConfigVM");
            var aItems = oVM.getProperty("/items") || [];
            if (isNaN(iIndex) || iIndex < 0) {
                return;
            }
            MessageBox.confirm(this._getText("formConfigDeleteConfirm"), {
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.CANCEL,
                onClose: function (sAction) {
                    if (sAction !== MessageBox.Action.OK) {
                        return;
                    }
                    this._deleteFormById(aItems[iIndex] && aItems[iIndex].originId);
                }
                .bind(this)
            });
        },

        _deleteFormById: function (sId) {
            if (!sId) {
                MessageToast.show(this._getText("deleteFailed"));
                return;
            }

            apiClient.request("/api/process/forms/" + encodeURIComponent(sId), {
                method: "DELETE"
            }).then(function () {
                MessageToast.show(this._getText("deleteSuccess"));
                this._loadFromApi();
            }.bind(this)).catch(function (oError) {
                MessageToast.show(apiClient.getErrorMessage(oError, this._getText("deleteFailed")));
            }.bind(this));
        },

        onSave: function () {
            var oVM = this.getView().getModel("formConfigVM");
            var aItems = oVM.getProperty("/items") || [];
            var mIdCounter = {};
            var bHasDuplicateId = false;

            if (!aItems.length) {
                MessageToast.show(this._getText("formConfigRequired"));
                return;
            }
            if (aItems.some(function (oItem) { return !oItem.id || !oItem.name; })) {
                MessageToast.show(this._getText("formConfigRequired"));
                return;
            }
            aItems.forEach(function (oItem) {
                var sIdKey = (oItem.id || "").trim().toUpperCase();
                if (!sIdKey) {
                    return;
                }
                mIdCounter[sIdKey] = (mIdCounter[sIdKey] || 0) + 1;
                if (mIdCounter[sIdKey] > 1) {
                    bHasDuplicateId = true;
                }
            });
            if (bHasDuplicateId) {
                MessageToast.show(this._getText("formConfigIdDuplicate"));
                return;
            }

            var oTrySave = this._applyFormConfigSave(aItems, false);
            if (oTrySave.ok) {
                return;
            }

            var sImpactedList = (oTrySave.impactedModelNames || []).join("、");
            MessageBox.confirm(this._getText("formConfigLinkedImpactConfirm", sImpactedList), {
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.CANCEL,
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        this._applyFormConfigSave(aItems, true);
                    }
                }.bind(this)
            });
        },

        onNavBack: function () {
            if (!this._hasUnsavedChanges()) {
                this.getOwnerComponent().getRouter().navTo("RouteHome");
                return;
            }

            MessageBox.confirm(this._getText("formConfigUnsavedConfirm"), {
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.OK,
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        this.getOwnerComponent().getRouter().navTo("RouteHome");
                    }
                }.bind(this)
            });
        }
    });
});