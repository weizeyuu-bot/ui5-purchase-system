sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "myapp/model/apiClient",
    "myapp/model/processApi"
], function (Controller, JSONModel, MessageToast, MessageBox, apiClient, processApi) {
    "use strict";

    return Controller.extend("myapp.controller.ProcessModelList", {
        onInit: function () {
            var oModel = this.getOwnerComponent().getModel("process");
            if (oModel) {
                this.getView().setModel(oModel, "process");
                this._loadFromApi();
            }

            this.getOwnerComponent().getRouter().getRoute("RouteProcessModels").attachPatternMatched(function () {
                this._loadFromApi();
            }, this);
        },

        _loadFromApi: function () {
            var oProcessModel = this.getOwnerComponent().getModel("process");
            if (!oProcessModel) {
                return;
            }

            processApi.refreshProcessModel(oProcessModel)
                .then(function () {
                    this._buildConfiguredProcessModels(oProcessModel);
                }.bind(this))
                .catch(function (oError) {
                    MessageToast.show(apiClient.getErrorMessage(oError, this._getI18nText("loadFailed")));
                }.bind(this));
        },

        _buildConfiguredProcessModels: function (oProcessModel) {
            var aModels = oProcessModel.getProperty("/processModels") || [];
            var aForms = oProcessModel.getProperty("/formConfigs") || [];
            var aNodes = oProcessModel.getProperty("/processNodes") || [];
            var oUsersModel = this.getOwnerComponent().getModel("users");
            var aRoleDefs = oUsersModel ? (oUsersModel.getProperty("/roles") || []) : [];
            var oDisplayModel = this.getView().getModel("processDisplay");

            var mFormsById = aForms.reduce(function (mResult, oForm) {
                mResult[oForm.id] = oForm;
                return mResult;
            }, {});

            var aConfiguredModels = aModels.map(function (oProcessModelItem) {
                var oLinkedForm = mFormsById[oProcessModelItem.formId] || null;
                var aModelNodes = aNodes.filter(function (oNode) {
                    return oNode.modelId === oProcessModelItem.id;
                });
                var aApprovalNodes = aModelNodes.filter(function (oNode) {
                    return oNode.nodeType === "审批节点";
                });
                var oInitiatorNode = aModelNodes.find(function (oNode) {
                    return oNode.nodeType === "发起节点";
                });
                var oLastApprovalNode = aApprovalNodes.length ? aApprovalNodes[aApprovalNodes.length - 1] : null;

                return Object.assign({}, oProcessModelItem, {
                    categoryId: oProcessModelItem.categoryId || (oLinkedForm ? (oLinkedForm.categoryId || "") : ""),
                    categoryName: oProcessModelItem.categoryName || (oLinkedForm ? (oLinkedForm.categoryName || "") : ""),
                    businessObject: (oLinkedForm && oLinkedForm.businessObject) || oProcessModelItem.businessObject,
                    initiatorRole: (oInitiatorNode && oInitiatorNode.assigneeRole) || (oLinkedForm && oLinkedForm.initiatorRole) || oProcessModelItem.initiatorRole,
                    approverRole: (oLastApprovalNode && oLastApprovalNode.assigneeRole) || (oLinkedForm && oLinkedForm.approverRole) || oProcessModelItem.approverRole,
                    nodeCount: aModelNodes.length || oProcessModelItem.nodeCount
                });
            });

            var oDisplayData = {
                configuredProcessModels: aConfiguredModels,
                formOptions: aForms.map(function (oForm) {
                    return { id: oForm.id, name: oForm.name };
                }),
                roleOptions: [{ key: "", text: this._getI18nText("pleaseSelect") }].concat(aRoleDefs.map(function (oRole) {
                    return { key: oRole.name, text: oRole.name };
                })).concat([{ key: "系统", text: "系统" }]),
                statusOptions: [
                    { key: "PUBLISHED", text: this._getI18nText("processStatusPublished") },
                    { key: "TESTING", text: this._getI18nText("processStatusTesting") }
                ],
                nodeTypeOptions: [
                    { key: "发起节点", text: this._getI18nText("processNodeTypeStart") },
                    { key: "提交节点", text: this._getI18nText("processNodeTypeSubmit") },
                    { key: "审批节点", text: this._getI18nText("processNodeTypeApprove") },
                    { key: "执行节点", text: this._getI18nText("processNodeTypeExecute") },
                    { key: "结束节点", text: this._getI18nText("processNodeTypeEnd") }
                ],
                editingModel: (oDisplayModel && oDisplayModel.getProperty("/editingModel")) || {},
                editingNodes: (oDisplayModel && oDisplayModel.getProperty("/editingNodes")) || [],
                editingSourceId: (oDisplayModel && oDisplayModel.getProperty("/editingSourceId")) || "",
                isCreate: (oDisplayModel && oDisplayModel.getProperty("/isCreate")) || false
            };

            if (oDisplayModel) {
                oDisplayModel.setData(oDisplayData);
            } else {
                this.getView().setModel(new JSONModel(oDisplayData), "processDisplay");
            }
        },

        _getI18nText: function (sKey) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey);
        },

        _getEditingFormConfig: function () {
            var oDisplayModel = this.getView().getModel("processDisplay");
            var sFormId = oDisplayModel ? oDisplayModel.getProperty("/editingModel/formId") : "";
            var aForms = this.getView().getModel("process").getProperty("/formConfigs") || [];
            return aForms.find(function (oForm) {
                return oForm.id === sFormId;
            }) || null;
        },

        _getDefaultAssigneeRoleByNodeType: function (sNodeType, oFormConfig) {
            if (sNodeType === "结束节点") {
                return "系统";
            }
            if (sNodeType === "发起节点") {
                return (oFormConfig && oFormConfig.initiatorRole) || "";
            }
            if (sNodeType === "审批节点") {
                return (oFormConfig && oFormConfig.approverRole) || "";
            }
            return "";
        },

        _applyDefaultRolesToNodes: function (aNodes, bForceForMappedTypes) {
            var oFormConfig = this._getEditingFormConfig();
            var bForce = !!bForceForMappedTypes;

            return aNodes.map(function (oNode) {
                var oNormalizedNode = Object.assign({}, oNode);
                var sDefaultRole = this._getDefaultAssigneeRoleByNodeType(oNormalizedNode.nodeType, oFormConfig);

                if (oNormalizedNode.nodeType === "结束节点") {
                    oNormalizedNode.assigneeRole = "系统";
                } else if (bForce && (oNormalizedNode.nodeType === "发起节点" || oNormalizedNode.nodeType === "审批节点")) {
                    oNormalizedNode.assigneeRole = sDefaultRole || oNormalizedNode.assigneeRole;
                } else if (!oNormalizedNode.assigneeRole && sDefaultRole) {
                    oNormalizedNode.assigneeRole = sDefaultRole;
                }

                return oNormalizedNode;
            }, this);
        },

        _openEditDialog: function (oProcessItem, bIsCreate) {
            var oProcessModel = this.getView().getModel("process");
            var aAllNodes = oProcessModel.getProperty("/processNodes") || [];
            var aEditingNodes = bIsCreate ? [] : aAllNodes.filter(function (oNode) {
                return oNode.modelId === oProcessItem.id;
            }).map(function (oNode) {
                return {
                    nodeId: oNode.nodeId,
                    nodeName: oNode.nodeName,
                    nodeType: oNode.nodeType,
                    nodeAction: oNode.nodeAction,
                    assigneeRole: oNode.assigneeRole,
                    sla: oNode.sla
                };
            });

            var oDisplayModel = this.getView().getModel("processDisplay");
            oDisplayModel.setProperty("/isCreate", bIsCreate);
            oDisplayModel.setProperty("/editingSourceId", bIsCreate ? "" : oProcessItem.id);
            oDisplayModel.setProperty("/editingModel", {
                id: oProcessItem.id || "",
                name: oProcessItem.name || "",
                formId: oProcessItem.formId || "",
                version: oProcessItem.version || "1.0",
                status: oProcessItem.status || "TESTING",
                description: oProcessItem.description || ""
            });
            oDisplayModel.setProperty("/editingNodes", this._applyDefaultRolesToNodes(aEditingNodes, false));
            this.byId("processModelDialog").open();
        },

        _buildDefaultNode: function (iIndex) {
            return {
                nodeId: "N" + (iIndex + 1),
                nodeName: "",
                nodeType: "审批节点",
                nodeAction: "",
                assigneeRole: "",
                sla: "1"
            };
        },

        _buildDefaultApprovalTemplateNodes: function () {
            return [
                { nodeId: "N1", nodeName: this._getI18nText("processNodeTemplateStart"), nodeType: "发起节点", nodeAction: this._getI18nText("processNodeTemplateStartAction"), assigneeRole: "", sla: "0.5" },
                { nodeId: "N2", nodeName: this._getI18nText("processNodeTemplateSubmit"), nodeType: "提交节点", nodeAction: this._getI18nText("processNodeTemplateSubmitAction"), assigneeRole: "", sla: "0.5" },
                { nodeId: "N3", nodeName: this._getI18nText("processNodeTemplateApprove"), nodeType: "审批节点", nodeAction: this._getI18nText("processNodeTemplateApproveAction"), assigneeRole: "", sla: "1" },
                { nodeId: "N4", nodeName: this._getI18nText("processNodeTemplateEnd"), nodeType: "结束节点", nodeAction: this._getI18nText("processNodeTemplateEndAction"), assigneeRole: "系统", sla: "0.2" }
            ];
        },

        _getNodeIndexFromEvent: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("processDisplay");
            var sPath = oCtx.getPath();
            return parseInt(sPath.split("/").pop(), 10);
        },

        _normalizeNodeIds: function (aNodes) {
            return aNodes.map(function (oNode, iIndex) {
                return Object.assign({}, oNode, {
                    nodeId: "N" + (iIndex + 1)
                });
            });
        },

        _getSelectedConfiguredModel: function () {
            var oTable = this.byId("processModelTable");
            var oSelectedItem = oTable && oTable.getSelectedItem();
            if (!oSelectedItem) {
                return null;
            }
            return oSelectedItem.getBindingContext("processDisplay").getObject();
        },

        onAddModel: function () {
            this.getOwnerComponent().getRouter().navTo("RouteProcessModelCreate");
        },

        onEditSelected: function () {
            var oSelectedModel = this._getSelectedConfiguredModel();
            if (!oSelectedModel) {
                MessageToast.show(this._getI18nText("processModelSelectOne"));
                return;
            }
            this.getOwnerComponent().getRouter().navTo("RouteProcessModelDetail", {
                modelId: oSelectedModel.id
            });
        },

        onEditModel: function (oEvent) {
            var oModelData = oEvent.getSource().getBindingContext("processDisplay").getObject();
            this.getOwnerComponent().getRouter().navTo("RouteProcessModelDetail", {
                modelId: oModelData.id
            });
        },

        onDeleteSelected: function () {
            var oSelectedModel = this._getSelectedConfiguredModel();
            if (!oSelectedModel) {
                MessageToast.show(this._getI18nText("processModelSelectOne"));
                return;
            }
            this._confirmDeleteModel(oSelectedModel.id, oSelectedModel.name);
        },

        onDeleteModel: function (oEvent) {
            var oModelData = oEvent.getSource().getBindingContext("processDisplay").getObject();
            this._confirmDeleteModel(oModelData.id, oModelData.name);
        },

        _confirmDeleteModel: function (sModelId, sModelName) {
            var oProcessModel = this.getView().getModel("process");
            var bInUse = (oProcessModel.getProperty("/processInstances") || []).some(function (oInstance) {
                if (oInstance.modelId) {
                    return oInstance.modelId === sModelId;
                }
                return oInstance.modelName === sModelName;
            });
            if (bInUse) {
                MessageToast.show(this._getI18nText("processModelDeleteBlocked"));
                return;
            }

            var bLinkedByDeployment = (oProcessModel.getProperty("/deployments") || []).some(function (oDeployment) {
                if (oDeployment.modelId) {
                    return oDeployment.modelId === sModelId;
                }
                return oDeployment.modelName === sModelName;
            });
            if (bLinkedByDeployment) {
                MessageToast.show(this._getI18nText("processModelDeleteBlockedByDeployment"));
                return;
            }

            MessageBox.confirm(this._getI18nText("processModelDeleteConfirm", [sModelId]), {
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.OK,
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        this._deleteModelById(sModelId);
                    }
                }.bind(this)
            });
        },

        _deleteModelById: function (sModelId) {
            apiClient.request("/api/process/models/" + encodeURIComponent(sModelId), {
                method: "DELETE"
            }).then(function () {
                MessageToast.show(this._getI18nText("deleteSuccess"));
                this._loadFromApi();
            }.bind(this)).catch(function (oError) {
                MessageToast.show(apiClient.getErrorMessage(oError, this._getI18nText("deleteFailed")));
            }.bind(this));
        },

        onRowPress: function (oEvent) {
            var oModelData = oEvent.getSource().getBindingContext("processDisplay").getObject();
            this.getOwnerComponent().getRouter().navTo("RouteProcessModelDetail", {
                modelId: oModelData.id
            });
        },

        onAddNode: function () {
            var oDisplayModel = this.getView().getModel("processDisplay");
            var aNodes = oDisplayModel.getProperty("/editingNodes") || [];
            aNodes.push(this._buildDefaultNode(aNodes.length));
            oDisplayModel.setProperty("/editingNodes", this._applyDefaultRolesToNodes(this._normalizeNodeIds(aNodes), false));
        },

        onFormChanged: function () {
            var oDisplayModel = this.getView().getModel("processDisplay");
            var aNodes = oDisplayModel.getProperty("/editingNodes") || [];
            oDisplayModel.setProperty("/editingNodes", this._applyDefaultRolesToNodes(this._normalizeNodeIds(aNodes), true));
        },

        onApplyNodeTemplate: function () {
            var oDisplayModel = this.getView().getModel("processDisplay");
            var aCurrentNodes = oDisplayModel.getProperty("/editingNodes") || [];
            var fnApply = function () {
                oDisplayModel.setProperty("/editingNodes", this._normalizeNodeIds(this._buildDefaultApprovalTemplateNodes()));
                MessageToast.show(this._getI18nText("processNodeTemplateApplied"));
            }.bind(this);

            if (!aCurrentNodes.length) {
                fnApply();
                return;
            }

            MessageBox.confirm(this._getI18nText("processNodeTemplateConfirm"), {
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.OK,
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        fnApply();
                    }
                }
            });
        },

        _insertNodeAt: function (iTargetIndex) {
            var oDisplayModel = this.getView().getModel("processDisplay");
            var aNodes = oDisplayModel.getProperty("/editingNodes") || [];
            var iSafeIndex = Math.max(0, Math.min(iTargetIndex, aNodes.length));
            aNodes.splice(iSafeIndex, 0, this._buildDefaultNode(aNodes.length));
            oDisplayModel.setProperty("/editingNodes", this._applyDefaultRolesToNodes(this._normalizeNodeIds(aNodes), false));
        },

        onInsertNodeBefore: function (oEvent) {
            var iIndex = this._getNodeIndexFromEvent(oEvent);
            if (isNaN(iIndex) || iIndex < 0) {
                return;
            }
            this._insertNodeAt(iIndex);
        },

        onInsertNodeAfter: function (oEvent) {
            var iIndex = this._getNodeIndexFromEvent(oEvent);
            if (isNaN(iIndex) || iIndex < 0) {
                return;
            }
            this._insertNodeAt(iIndex + 1);
        },

        onMoveNodeUp: function (oEvent) {
            var oDisplayModel = this.getView().getModel("processDisplay");
            var aNodes = oDisplayModel.getProperty("/editingNodes") || [];
            var iIndex = this._getNodeIndexFromEvent(oEvent);
            if (isNaN(iIndex) || iIndex <= 0) {
                return;
            }

            var oCurrent = aNodes[iIndex];
            aNodes[iIndex] = aNodes[iIndex - 1];
            aNodes[iIndex - 1] = oCurrent;
            oDisplayModel.setProperty("/editingNodes", this._applyDefaultRolesToNodes(this._normalizeNodeIds(aNodes), false));
        },

        onMoveNodeDown: function (oEvent) {
            var oDisplayModel = this.getView().getModel("processDisplay");
            var aNodes = oDisplayModel.getProperty("/editingNodes") || [];
            var iIndex = this._getNodeIndexFromEvent(oEvent);
            if (isNaN(iIndex) || iIndex < 0 || iIndex >= aNodes.length - 1) {
                return;
            }

            var oCurrent = aNodes[iIndex];
            aNodes[iIndex] = aNodes[iIndex + 1];
            aNodes[iIndex + 1] = oCurrent;
            oDisplayModel.setProperty("/editingNodes", this._applyDefaultRolesToNodes(this._normalizeNodeIds(aNodes), false));
        },

        onNodeTypeChange: function (oEvent) {
            var oDisplayModel = this.getView().getModel("processDisplay");
            var aNodes = oDisplayModel.getProperty("/editingNodes") || [];
            var iIndex = this._getNodeIndexFromEvent(oEvent);
            if (isNaN(iIndex) || iIndex < 0 || iIndex >= aNodes.length) {
                return;
            }

            var oFormConfig = this._getEditingFormConfig();
            var sNodeType = aNodes[iIndex].nodeType;
            var sDefaultRole = this._getDefaultAssigneeRoleByNodeType(sNodeType, oFormConfig);

            if (sNodeType === "结束节点") {
                aNodes[iIndex].assigneeRole = "系统";
            } else if (!aNodes[iIndex].assigneeRole || aNodes[iIndex].assigneeRole === "系统") {
                aNodes[iIndex].assigneeRole = sDefaultRole || "";
            }

            oDisplayModel.setProperty("/editingNodes", this._applyDefaultRolesToNodes(this._normalizeNodeIds(aNodes), false));
        },

        onCopyNode: function (oEvent) {
            var oDisplayModel = this.getView().getModel("processDisplay");
            var aNodes = oDisplayModel.getProperty("/editingNodes") || [];
            var iIndex = this._getNodeIndexFromEvent(oEvent);
            if (isNaN(iIndex) || iIndex < 0 || iIndex >= aNodes.length) {
                return;
            }

            var oSourceNode = aNodes[iIndex];
            var oClonedNode = Object.assign({}, oSourceNode, {
                nodeName: (oSourceNode.nodeName || "") + this._getI18nText("processNodeCopySuffix")
            });
            aNodes.splice(iIndex + 1, 0, oClonedNode);
            oDisplayModel.setProperty("/editingNodes", this._applyDefaultRolesToNodes(this._normalizeNodeIds(aNodes), false));
        },

        onDeleteNode: function (oEvent) {
            var oDisplayModel = this.getView().getModel("processDisplay");
            var iIndex = this._getNodeIndexFromEvent(oEvent);
            var aNodes = oDisplayModel.getProperty("/editingNodes") || [];
            if (!isNaN(iIndex) && iIndex >= 0) {
                aNodes.splice(iIndex, 1);
                oDisplayModel.setProperty("/editingNodes", this._applyDefaultRolesToNodes(this._normalizeNodeIds(aNodes), false));
            }
        },

        onDialogSave: function () {
            var oDisplayModel = this.getView().getModel("processDisplay");
            var oDraft = Object.assign({}, oDisplayModel.getProperty("/editingModel"));
            var aEditingNodes = this._applyDefaultRolesToNodes(this._normalizeNodeIds(oDisplayModel.getProperty("/editingNodes") || []), false).map(function (oNode, iIndex) {
                return {
                    nodeId: oNode.nodeId || ("N" + (iIndex + 1)),
                    nodeName: oNode.nodeName || "",
                    nodeType: oNode.nodeType || "审批节点",
                    nodeAction: oNode.nodeAction || "",
                    assigneeRole: oNode.assigneeRole || "",
                    sla: oNode.sla || "1"
                };
            });
            var bIsCreate = !!oDisplayModel.getProperty("/isCreate");
            var sSourceId = oDisplayModel.getProperty("/editingSourceId");

            if (!oDraft.id || !oDraft.name || !oDraft.formId || !oDraft.version) {
                MessageToast.show(this._getI18nText("processModelRequired"));
                return;
            }
            if (aEditingNodes.some(function (oNode) {
                return !oNode.nodeName || !oNode.nodeType || !oNode.assigneeRole;
            })) {
                MessageToast.show(this._getI18nText("processNodeRequired"));
                return;
            }

            var oProcessModel = this.getView().getModel("process");
            var aProcessModels = oProcessModel.getProperty("/processModels") || [];
            var aFormConfigs = oProcessModel.getProperty("/formConfigs") || [];
            var aNodes = oProcessModel.getProperty("/processNodes") || [];
            var oLinkedForm = aFormConfigs.find(function (oForm) {
                return oForm.id === oDraft.formId;
            });
            var sCategoryId = oLinkedForm ? (oLinkedForm.categoryId || "") : "";
            var sCategoryName = oLinkedForm ? (oLinkedForm.categoryName || "") : "";

            if (bIsCreate) {
                if (aProcessModels.some(function (oItem) { return oItem.id === oDraft.id; })) {
                    MessageToast.show(this._getI18nText("processModelIdExists"));
                    return;
                }
                aProcessModels.push({
                    id: oDraft.id,
                    name: oDraft.name,
                    categoryId: sCategoryId,
                    categoryName: sCategoryName,
                    formId: oDraft.formId,
                    formName: oLinkedForm ? oLinkedForm.name : "",
                    version: oDraft.version,
                    status: oDraft.status || "TESTING",
                    description: oDraft.description || "",
                    businessObject: "",
                    initiatorRole: "",
                    approverRole: "",
                    nodeCount: aEditingNodes.length
                });
                aNodes = aNodes.concat(aEditingNodes.map(function (oNode) {
                    return Object.assign({}, oNode, { modelId: oDraft.id });
                }));
            } else {
                var iIndex = aProcessModels.findIndex(function (oItem) {
                    return oItem.id === sSourceId;
                });
                if (iIndex < 0) {
                    MessageToast.show(this._getI18nText("processModelNotFound"));
                    return;
                }
                if (oDraft.id !== sSourceId && aProcessModels.some(function (oItem) { return oItem.id === oDraft.id; })) {
                    MessageToast.show(this._getI18nText("processModelIdExists"));
                    return;
                }

                aProcessModels[iIndex] = Object.assign({}, aProcessModels[iIndex], {
                    id: oDraft.id,
                    name: oDraft.name,
                    categoryId: sCategoryId,
                    categoryName: sCategoryName,
                    formId: oDraft.formId,
                    formName: oLinkedForm ? oLinkedForm.name : aProcessModels[iIndex].formName,
                    version: oDraft.version,
                    status: oDraft.status || aProcessModels[iIndex].status,
                    description: oDraft.description || "",
                    nodeCount: aEditingNodes.length
                });

                aNodes = aNodes.filter(function (oNode) {
                    return oNode.modelId !== sSourceId;
                }).concat(aEditingNodes.map(function (oNode) {
                    return Object.assign({}, oNode, { modelId: oDraft.id });
                }));
            }

            oProcessModel.setProperty("/processModels", aProcessModels);
            oProcessModel.setProperty("/processNodes", aNodes);
            this._buildConfiguredProcessModels(oProcessModel);
            this.byId("processModelDialog").close();
            MessageToast.show(this._getI18nText("saveSuccess"));
        },

        onDialogCancel: function () {
            this.byId("processModelDialog").close();
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteHome");
        }
    });
});