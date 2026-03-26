sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("myapp.controller.ProcessModelDetail", {
        onInit: function () {
            var oProcessModel = this.getOwnerComponent().getModel("process");
            this.getView().setModel(oProcessModel, "process");

            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteProcessModelCreate").attachPatternMatched(this._onCreateMatched, this);
            oRouter.getRoute("RouteProcessModelDetail").attachPatternMatched(this._onDetailMatched, this);
        },

        _buildDisplayModel: function () {
            var oProcessModel = this.getView().getModel("process");
            var aForms = oProcessModel.getProperty("/formConfigs") || [];
            var oUsersModel = this.getOwnerComponent().getModel("users");
            var aRoleDefs = oUsersModel ? (oUsersModel.getProperty("/roles") || []) : [];

            this.getView().setModel(new JSONModel({
                pageTitle: "",
                isCreate: true,
                editingSourceId: "",
                editingModel: {},
                editingNodes: [],
                visualStages: [],
                parallelGroups: [],
                conditionalSets: [],
                hasParallelGroups: false,
                hasConditionalSets: false,
                formOptions: aForms.map(function (oForm) { return { id: oForm.id, name: oForm.name }; }),
                mergeTargetOptions: [{ key: "", text: this._getI18nText("pleaseSelect") }],
                conditionFieldOptions: [{ key: "", text: this._getI18nText("pleaseSelect") }],
                conditionOperatorOptions: [
                    { key: "EQ", text: this._getI18nText("processConditionOperatorEq") },
                    { key: "NE", text: this._getI18nText("processConditionOperatorNe") },
                    { key: "GT", text: this._getI18nText("processConditionOperatorGt") },
                    { key: "GTE", text: this._getI18nText("processConditionOperatorGte") },
                    { key: "LT", text: this._getI18nText("processConditionOperatorLt") },
                    { key: "LTE", text: this._getI18nText("processConditionOperatorLte") },
                    { key: "CONTAINS", text: this._getI18nText("processConditionOperatorContains") }
                ],
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
                nodePolicyOptions: [
                    { key: "REQUIRED", text: this._getI18nText("processNodePolicyRequired") },
                    { key: "OPTIONAL", text: this._getI18nText("processNodePolicyOptional") },
                    { key: "PARALLEL", text: this._getI18nText("processNodePolicyParallel") },
                    { key: "CONDITIONAL", text: this._getI18nText("processNodePolicyConditional") }
                ]
            }), "processDisplay");
        },

        _onCreateMatched: function () {
            this._buildDisplayModel();
            var oDisplayModel = this.getView().getModel("processDisplay");
            oDisplayModel.setProperty("/isCreate", true);
            oDisplayModel.setProperty("/pageTitle", this._getI18nText("processModelAddTitle"));
            oDisplayModel.setProperty("/editingModel", { id: "", name: "", formId: "", version: "1.0", status: "TESTING", description: "" });
            this._refreshConditionFieldOptions();
            this._setEditingNodes([], false);
        },

        _onDetailMatched: function (oEvent) {
            var sModelId = oEvent.getParameter("arguments").modelId;
            this._buildDisplayModel();
            var oDisplayModel = this.getView().getModel("processDisplay");
            var oProcessModel = this.getView().getModel("process");
            var aModels = oProcessModel.getProperty("/processModels") || [];
            var aNodes = oProcessModel.getProperty("/processNodes") || [];
            var oModelItem = aModels.find(function (oItem) { return oItem.id === sModelId; });

            if (!oModelItem) {
                MessageToast.show(this._getI18nText("processModelNotFound"));
                this.onNavBack();
                return;
            }

            oDisplayModel.setProperty("/isCreate", false);
            oDisplayModel.setProperty("/editingSourceId", sModelId);
            oDisplayModel.setProperty("/pageTitle", this._getI18nText("processModelEditTitle"));
            oDisplayModel.setProperty("/editingModel", {
                id: oModelItem.id,
                name: oModelItem.name,
                formId: oModelItem.formId,
                version: oModelItem.version,
                status: oModelItem.status,
                description: oModelItem.description || ""
            });
            this._refreshConditionFieldOptions();
            this._setEditingNodes((aNodes.filter(function (oNode) {
                return oNode.modelId === sModelId;
            }).map(function (oNode, iIndex) {
                return {
                    nodeId: oNode.nodeId,
                    nodeName: oNode.nodeName,
                    nodeType: oNode.nodeType,
                    nodeAction: oNode.nodeAction,
                    assigneeRole: oNode.assigneeRole,
                    nodePolicy: oNode.nodePolicy || "REQUIRED",
                    nodeParallelGroup: oNode.nodeParallelGroup || "",
                    nodeBranchSet: oNode.nodeBranchSet || "",
                    nodeBranchGroup: oNode.nodeBranchGroup || "",
                    nodeBranchMergeTo: oNode.nodeBranchMergeTo || "",
                    nodeConditionField: oNode.nodeConditionField || "",
                    nodeConditionOperator: oNode.nodeConditionOperator || "",
                    nodeConditionValue: oNode.nodeConditionValue || "",
                    nodeConditionIsDefault: !!oNode.nodeConditionIsDefault,
                    __originIndex: iIndex,
                    sla: oNode.sla
                };
            })), false);
        },

        _getI18nText: function (sKey, aArgs) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey, aArgs);
        },

        _getNextAutoVersion: function (sCurrentVersion, bIsCreate) {
            if (bIsCreate) {
                return "1.0";
            }
            var fCurrent = parseFloat(sCurrentVersion);
            if (!isFinite(fCurrent)) {
                return "1.0";
            }
            return (Math.round((fCurrent + 0.1) * 10) / 10).toFixed(1);
        },

        formatVisualNodeKind: function (sNodeType) {
            switch (sNodeType) {
                case "发起节点":
                    return "start";
                case "提交节点":
                    return "submit";
                case "审批节点":
                    return "approve";
                case "执行节点":
                    return "execute";
                case "结束节点":
                    return "end";
                default:
                    return "default";
            }
        },

        formatNodePolicyText: function (sPolicy) {
            if (sPolicy === "OPTIONAL") {
                return this._getI18nText("processNodePolicyOptional");
            }
            if (sPolicy === "PARALLEL") {
                return this._getI18nText("processNodePolicyParallel");
            }
            if (sPolicy === "CONDITIONAL") {
                return this._getI18nText("processNodePolicyConditional");
            }
            return this._getI18nText("processNodePolicyRequired");
        },

        formatNodePolicyState: function (sPolicy) {
            if (sPolicy === "OPTIONAL") {
                return "Warning";
            }
            if (sPolicy === "PARALLEL") {
                return "Information";
            }
            if (sPolicy === "CONDITIONAL") {
                return "Warning";
            }
            return "Success";
        },

        formatParallelGroupText: function (sGroup) {
            if (!sGroup) {
                return "";
            }
            return this._getI18nText("processNodeParallelGroupPrefix") + sGroup;
        },

        formatConditionSummary: function (sField, sOperator, sValue, bIsDefault) {
            if (bIsDefault) {
                return this._getI18nText("processNodeConditionDefault");
            }
            if (!sField || !sOperator || sValue === undefined || sValue === null || sValue === "") {
                return "";
            }
            return sField + " " + this._getConditionOperatorSymbol(sOperator) + " " + sValue;
        },

        formatMergeTargetSummary: function (sTargetId, sTargetLabel) {
            if (!sTargetId) {
                return "";
            }
            return this._getI18nText("processNodeBranchMergeToPrefix") + (sTargetLabel || this._getI18nText("processMergeTargetGeneric"));
        },

        _getEditingFormConfig: function () {
            var oDisplayModel = this.getView().getModel("processDisplay");
            var sFormId = oDisplayModel.getProperty("/editingModel/formId") || "";
            var aForms = this.getView().getModel("process").getProperty("/formConfigs") || [];
            return aForms.find(function (oForm) { return oForm.id === sFormId; }) || null;
        },

        _refreshConditionFieldOptions: function () {
            var oDisplayModel = this.getView().getModel("processDisplay");
            var oFormConfig = this._getEditingFormConfig();
            var aFields = oFormConfig && Array.isArray(oFormConfig.fields) ? oFormConfig.fields : [];

            oDisplayModel.setProperty("/conditionFieldOptions", [{ key: "", text: this._getI18nText("pleaseSelect") }].concat(aFields.map(function (sField) {
                return {
                    key: sField,
                    text: sField
                };
            })));
        },

        _getDefaultConditionField: function (oFormConfig) {
            return oFormConfig && Array.isArray(oFormConfig.fields) && oFormConfig.fields.length ? oFormConfig.fields[0] : "";
        },

        _getConditionOperatorSymbol: function (sOperator) {
            switch (sOperator) {
                case "NE":
                    return "!=";
                case "GT":
                    return ">";
                case "GTE":
                    return ">=";
                case "LT":
                    return "<";
                case "LTE":
                    return "<=";
                case "CONTAINS":
                    return this._getI18nText("processConditionOperatorContainsShort");
                case "EQ":
                default:
                    return "=";
            }
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
            var sDefaultConditionField = this._getDefaultConditionField(oFormConfig);
            return aNodes.map(function (oNode) {
                var oNormalizedNode = Object.assign({}, oNode);
                oNormalizedNode.nodePolicy = oNormalizedNode.nodePolicy || "REQUIRED";
                if (oNormalizedNode.nodePolicy === "PARALLEL") {
                    oNormalizedNode.nodeParallelGroup = oNormalizedNode.nodeParallelGroup || "PG1";
                    oNormalizedNode.nodeBranchSet = "";
                    oNormalizedNode.nodeBranchGroup = "";
                    oNormalizedNode.nodeBranchMergeTo = "";
                    oNormalizedNode.nodeConditionField = "";
                    oNormalizedNode.nodeConditionOperator = "";
                    oNormalizedNode.nodeConditionValue = "";
                    oNormalizedNode.nodeConditionIsDefault = false;
                } else if (oNormalizedNode.nodePolicy === "CONDITIONAL") {
                    oNormalizedNode.nodeParallelGroup = "";
                    oNormalizedNode.nodeBranchSet = oNormalizedNode.nodeBranchSet || "CS1";
                    oNormalizedNode.nodeBranchGroup = oNormalizedNode.nodeBranchGroup || "CG1";
                    oNormalizedNode.nodeBranchMergeTo = oNormalizedNode.nodeBranchMergeTo || "";
                    oNormalizedNode.nodeConditionIsDefault = !!oNormalizedNode.nodeConditionIsDefault;
                    oNormalizedNode.nodeConditionField = oNormalizedNode.nodeConditionIsDefault ? "" : (oNormalizedNode.nodeConditionField || sDefaultConditionField);
                    oNormalizedNode.nodeConditionOperator = oNormalizedNode.nodeConditionIsDefault ? "" : (oNormalizedNode.nodeConditionOperator || "EQ");
                    oNormalizedNode.nodeConditionValue = oNormalizedNode.nodeConditionIsDefault ? "" : (oNormalizedNode.nodeConditionValue || "");
                } else {
                    oNormalizedNode.nodeParallelGroup = "";
                    oNormalizedNode.nodeBranchSet = "";
                    oNormalizedNode.nodeBranchGroup = "";
                    oNormalizedNode.nodeBranchMergeTo = "";
                    oNormalizedNode.nodeConditionField = "";
                    oNormalizedNode.nodeConditionOperator = "";
                    oNormalizedNode.nodeConditionValue = "";
                    oNormalizedNode.nodeConditionIsDefault = false;
                }
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

        _normalizeNodeIds: function (aNodes) {
            var mNodeIdMap = {};
            (aNodes || []).forEach(function (oNode, iIndex) {
                mNodeIdMap[oNode.nodeId] = "N" + (iIndex + 1);
            });

            return (aNodes || []).map(function (oNode, iIndex) {
                var sNewNodeId = "N" + (iIndex + 1);
                return Object.assign({}, oNode, {
                    nodeId: sNewNodeId,
                    nodeBranchMergeTo: oNode.nodeBranchMergeTo ? (mNodeIdMap[oNode.nodeBranchMergeTo] || "") : ""
                });
            });
        },

        _autoAssignConditionalBranchIdentifiers: function (aNodes) {
            var iSetCounter = 1;
            var mUsedSets = {};
            var mUsedGroupsBySet = {};

            (aNodes || []).forEach(function (oNode) {
                if (oNode.nodePolicy !== "CONDITIONAL" || !oNode.nodeBranchSet) {
                    return;
                }
                mUsedSets[oNode.nodeBranchSet] = true;
                if (!mUsedGroupsBySet[oNode.nodeBranchSet]) {
                    mUsedGroupsBySet[oNode.nodeBranchSet] = {};
                }
                if (oNode.nodeBranchGroup) {
                    mUsedGroupsBySet[oNode.nodeBranchSet][oNode.nodeBranchGroup] = true;
                }
            });

            var fnNextSetId = function () {
                while (mUsedSets["CS" + iSetCounter]) {
                    iSetCounter += 1;
                }
                var sSetId = "CS" + iSetCounter;
                mUsedSets[sSetId] = true;
                return sSetId;
            };

            var fnNextGroupId = function (sSetId) {
                if (!mUsedGroupsBySet[sSetId]) {
                    mUsedGroupsBySet[sSetId] = {};
                }
                var iGroupCounter = 1;
                while (mUsedGroupsBySet[sSetId]["CG" + iGroupCounter]) {
                    iGroupCounter += 1;
                }
                var sGroupId = "CG" + iGroupCounter;
                mUsedGroupsBySet[sSetId][sGroupId] = true;
                return sGroupId;
            };

            var sLastConditionalSet = "";
            return (aNodes || []).map(function (oNode) {
                if (oNode.nodePolicy !== "CONDITIONAL") {
                    sLastConditionalSet = "";
                    return Object.assign({}, oNode);
                }

                var oNormalizedNode = Object.assign({}, oNode);
                var sSetId = oNormalizedNode.nodeBranchSet || sLastConditionalSet || fnNextSetId();
                oNormalizedNode.nodeBranchSet = sSetId;
                mUsedSets[sSetId] = true;
                if (!mUsedGroupsBySet[sSetId]) {
                    mUsedGroupsBySet[sSetId] = {};
                }

                if (oNormalizedNode.nodeConditionIsDefault) {
                    oNormalizedNode.nodeBranchGroup = "CG_DEFAULT";
                    mUsedGroupsBySet[sSetId].CG_DEFAULT = true;
                } else {
                    var sGroupId = oNormalizedNode.nodeBranchGroup;
                    if (!sGroupId || sGroupId === "CG_DEFAULT") {
                        sGroupId = fnNextGroupId(sSetId);
                    }
                    oNormalizedNode.nodeBranchGroup = sGroupId;
                    mUsedGroupsBySet[sSetId][sGroupId] = true;
                }

                sLastConditionalSet = sSetId;
                return oNormalizedNode;
            });
        },

        _refreshMergeTargetOptions: function (aNodes) {
            var oDisplayModel = this.getView().getModel("processDisplay");
            var aOptions = [{ key: "", text: this._getI18nText("pleaseSelect") }].concat((aNodes || []).map(function (oNode) {
                return {
                    key: oNode.nodeId,
                    text: oNode.nodeId + " " + (oNode.nodeName || oNode.nodeType || "")
                };
            }));
            oDisplayModel.setProperty("/mergeTargetOptions", aOptions);
        },

        _refreshParallelGroups: function (aNodes) {
            var oDisplayModel = this.getView().getModel("processDisplay");
            var mGrouped = {};

            (aNodes || []).forEach(function (oNode, iIndex) {
                if (oNode.nodePolicy !== "PARALLEL" || !oNode.nodeParallelGroup) {
                    return;
                }
                if (!mGrouped[oNode.nodeParallelGroup]) {
                    mGrouped[oNode.nodeParallelGroup] = [];
                }
                mGrouped[oNode.nodeParallelGroup].push({
                    nodeId: oNode.nodeId,
                    nodeName: oNode.nodeName,
                    nodeType: oNode.nodeType,
                    assigneeRole: oNode.assigneeRole,
                    nodeAction: oNode.nodeAction,
                    groupId: oNode.nodeParallelGroup,
                    sourceIndex: iIndex
                });
            });

            var aParallelGroups = Object.keys(mGrouped).map(function (sGroupId) {
                var aGroupNodes = mGrouped[sGroupId].map(function (oNode, iIndex, aAll) {
                    return Object.assign({}, oNode, {
                        canMoveUp: iIndex > 0,
                        canMoveDown: iIndex < aAll.length - 1
                    });
                });
                return {
                    groupId: sGroupId,
                    nodeCount: aGroupNodes.length,
                    nodes: aGroupNodes
                };
            });

            oDisplayModel.setProperty("/parallelGroups", aParallelGroups);
            oDisplayModel.setProperty("/hasParallelGroups", aParallelGroups.length > 0);
        },

        _refreshConditionalGroups: function (aNodes) {
            var oDisplayModel = this.getView().getModel("processDisplay");
            var mGrouped = {};
            var mMergeTargetLabels = {};

            (aNodes || []).forEach(function (oNode) {
                mMergeTargetLabels[oNode.nodeId] = oNode.nodeName || oNode.nodeType || "";
            });

            (aNodes || []).forEach(function (oNode, iIndex) {
                if (oNode.nodePolicy !== "CONDITIONAL" || !oNode.nodeBranchSet || !oNode.nodeBranchGroup) {
                    return;
                }
                if (!mGrouped[oNode.nodeBranchSet]) {
                    mGrouped[oNode.nodeBranchSet] = {};
                }
                if (!mGrouped[oNode.nodeBranchSet][oNode.nodeBranchGroup]) {
                    mGrouped[oNode.nodeBranchSet][oNode.nodeBranchGroup] = [];
                }
                mGrouped[oNode.nodeBranchSet][oNode.nodeBranchGroup].push({
                    nodeId: oNode.nodeId,
                    nodeName: oNode.nodeName,
                    nodeType: oNode.nodeType,
                    assigneeRole: oNode.assigneeRole,
                    nodeAction: oNode.nodeAction,
                    setId: oNode.nodeBranchSet,
                    groupId: oNode.nodeBranchGroup,
                    sourceIndex: iIndex,
                    mergeTargetId: oNode.nodeBranchMergeTo || "",
                    mergeTargetLabel: oNode.nodeBranchMergeTo ? (mMergeTargetLabels[oNode.nodeBranchMergeTo] || oNode.nodeBranchMergeTo) : "",
                    isDefault: !!oNode.nodeConditionIsDefault,
                    conditionSummary: this.formatConditionSummary(oNode.nodeConditionField, oNode.nodeConditionOperator, oNode.nodeConditionValue, oNode.nodeConditionIsDefault)
                });
            }, this);

            var aConditionalSets = Object.keys(mGrouped).map(function (sSetId) {
                var oBranchGroups = mGrouped[sSetId];
                var aBranches = Object.keys(oBranchGroups).map(function (sGroupId) {
                    var aGroupNodes = oBranchGroups[sGroupId];
                    return {
                        setId: sSetId,
                        groupId: sGroupId,
                        nodeCount: aGroupNodes.length,
                        isDefault: !!(aGroupNodes.length && aGroupNodes[0].isDefault),
                        conditionSummary: aGroupNodes.length ? aGroupNodes[0].conditionSummary : "",
                        mergeTargetId: aGroupNodes.length ? aGroupNodes[0].mergeTargetId : "",
                        mergeTargetLabel: aGroupNodes.length ? aGroupNodes[0].mergeTargetLabel : "",
                        nodes: aGroupNodes
                    };
                });
                return {
                    setId: sSetId,
                    branchCount: aBranches.length,
                    hasDefaultBranch: aBranches.some(function (oBranch) { return oBranch.isDefault; }),
                    branches: aBranches
                };
            });

            oDisplayModel.setProperty("/conditionalSets", aConditionalSets);
            oDisplayModel.setProperty("/hasConditionalSets", aConditionalSets.length > 0);
        },

        _refreshVisualStages: function (aNodes) {
            var oDisplayModel = this.getView().getModel("processDisplay");
            var aStages = [];

            (aNodes || []).forEach(function (oNode) {
                var bParallel = oNode.nodePolicy === "PARALLEL" && !!oNode.nodeParallelGroup;
                var bConditional = oNode.nodePolicy === "CONDITIONAL" && !!oNode.nodeBranchSet && !!oNode.nodeBranchGroup;
                var oLastStage = aStages.length ? aStages[aStages.length - 1] : null;

                if (bParallel) {
                    if (oLastStage && oLastStage.stageKind === "parallel" && oLastStage.groupId === oNode.nodeParallelGroup) {
                        oLastStage.nodes.push(oNode);
                        oLastStage.nodeCount = oLastStage.nodes.length;
                    } else {
                        aStages.push({
                            stageKind: "parallel",
                            groupId: oNode.nodeParallelGroup,
                            nodes: [oNode],
                            nodeCount: 1
                        });
                    }
                } else if (bConditional) {
                    if (oLastStage && oLastStage.stageKind === "conditional" && oLastStage.setId === oNode.nodeBranchSet) {
                        if (!oLastStage.branchMap[oNode.nodeBranchGroup]) {
                            oLastStage.branchMap[oNode.nodeBranchGroup] = {
                                groupId: oNode.nodeBranchGroup,
                                isDefault: !!oNode.nodeConditionIsDefault,
                                conditionSummary: this.formatConditionSummary(oNode.nodeConditionField, oNode.nodeConditionOperator, oNode.nodeConditionValue, oNode.nodeConditionIsDefault),
                                mergeTargetId: oNode.nodeBranchMergeTo || "",
                                mergeTargetLabel: "",
                                nodes: []
                            };
                            oLastStage.branches.push(oLastStage.branchMap[oNode.nodeBranchGroup]);
                        }
                        oLastStage.branchMap[oNode.nodeBranchGroup].nodes.push(oNode);
                        oLastStage.nodeCount += 1;
                    } else {
                        var oBranch = {
                            groupId: oNode.nodeBranchGroup,
                            isDefault: !!oNode.nodeConditionIsDefault,
                            conditionSummary: this.formatConditionSummary(oNode.nodeConditionField, oNode.nodeConditionOperator, oNode.nodeConditionValue, oNode.nodeConditionIsDefault),
                            mergeTargetId: oNode.nodeBranchMergeTo || "",
                            mergeTargetLabel: "",
                            nodes: [oNode]
                        };
                        aStages.push({
                            stageKind: "conditional",
                            setId: oNode.nodeBranchSet,
                            branchMap: (function () {
                                var mMap = {};
                                mMap[oNode.nodeBranchGroup] = oBranch;
                                return mMap;
                            }()),
                            branches: [oBranch],
                            nodeCount: 1
                        });
                    }
                } else {
                    aStages.push({
                        stageKind: "single",
                        nodes: [oNode],
                        nodeCount: 1
                    });
                }
            }, this);

            var mMergeTargetLabels = {};
            (aNodes || []).forEach(function (oNode) {
                mMergeTargetLabels[oNode.nodeId] = oNode.nodeName || oNode.nodeType || "";
            });

            oDisplayModel.setProperty("/visualStages", aStages.map(function (oStage) {
                if (oStage.stageKind === "conditional") {
                    var bShownYes = false;
                    var bShownNo = false;
                    oStage.branches.forEach(function (oBranch) {
                        oBranch.mergeTargetLabel = oBranch.mergeTargetId ? (mMergeTargetLabels[oBranch.mergeTargetId] || oBranch.mergeTargetId) : "";
                        oBranch.showSplitYes = !oBranch.isDefault && !bShownYes;
                        oBranch.showSplitNo = !!oBranch.isDefault && !bShownNo;
                        bShownYes = bShownYes || oBranch.showSplitYes;
                        bShownNo = bShownNo || oBranch.showSplitNo;
                    });
                    delete oStage.branchMap;
                }
                return oStage;
            }));
        },

        _setEditingNodes: function (aNodes, bForceForMappedTypes) {
            var oDisplayModel = this.getView().getModel("processDisplay");
            var aNormalizedNodes = this._autoAssignConditionalBranchIdentifiers(this._applyDefaultRolesToNodes(this._normalizeNodeIds(aNodes || []), !!bForceForMappedTypes));
            oDisplayModel.setProperty("/editingNodes", aNormalizedNodes);
            this._refreshMergeTargetOptions(aNormalizedNodes);
            this._refreshParallelGroups(aNormalizedNodes);
            this._refreshConditionalGroups(aNormalizedNodes);
            this._refreshVisualStages(aNormalizedNodes);
        },

        _moveParallelNodeByOffset: function (oParallelNode, iOffset) {
            if (!oParallelNode || !oParallelNode.groupId || typeof oParallelNode.sourceIndex !== "number") {
                return;
            }

            var oDisplayModel = this.getView().getModel("processDisplay");
            var aNodes = oDisplayModel.getProperty("/editingNodes") || [];
            var aGroupIndexes = [];

            aNodes.forEach(function (oNode, iIndex) {
                if (oNode.nodePolicy === "PARALLEL" && oNode.nodeParallelGroup === oParallelNode.groupId) {
                    aGroupIndexes.push(iIndex);
                }
            });

            var iCurrentPos = aGroupIndexes.indexOf(oParallelNode.sourceIndex);
            if (iCurrentPos < 0) {
                return;
            }

            var iTargetPos = iCurrentPos + iOffset;
            if (iTargetPos < 0 || iTargetPos >= aGroupIndexes.length) {
                return;
            }

            var iSourceIndex = aGroupIndexes[iCurrentPos];
            var iTargetIndex = aGroupIndexes[iTargetPos];
            var oTemp = aNodes[iSourceIndex];
            aNodes[iSourceIndex] = aNodes[iTargetIndex];
            aNodes[iTargetIndex] = oTemp;

            this._setEditingNodes(aNodes, false);
        },

        onMoveParallelNodeUp: function (oEvent) {
            var oParallelNode = oEvent.getSource().getBindingContext("processDisplay").getObject();
            this._moveParallelNodeByOffset(oParallelNode, -1);
        },

        onMoveParallelNodeDown: function (oEvent) {
            var oParallelNode = oEvent.getSource().getBindingContext("processDisplay").getObject();
            this._moveParallelNodeByOffset(oParallelNode, 1);
        },

        _sortParallelGroupNodes: function (sGroupId, fnComparator) {
            if (!sGroupId || typeof fnComparator !== "function") {
                return;
            }

            var oDisplayModel = this.getView().getModel("processDisplay");
            var aNodes = oDisplayModel.getProperty("/editingNodes") || [];
            var aGroupIndexes = [];
            var aGroupNodes = [];

            aNodes.forEach(function (oNode, iIndex) {
                if (oNode.nodePolicy === "PARALLEL" && oNode.nodeParallelGroup === sGroupId) {
                    aGroupIndexes.push(iIndex);
                    aGroupNodes.push(Object.assign({}, oNode));
                }
            });

            if (aGroupNodes.length < 2) {
                return;
            }

            aGroupNodes.sort(fnComparator);
            aGroupIndexes.forEach(function (iNodeIndex, iPos) {
                aNodes[iNodeIndex] = aGroupNodes[iPos];
            });

            this._setEditingNodes(aNodes, false);
        },

        onSortParallelGroupByName: function (oEvent) {
            var oGroup = oEvent.getSource().getBindingContext("processDisplay").getObject();
            if (!oGroup || !oGroup.groupId) {
                return;
            }

            this._sortParallelGroupNodes(oGroup.groupId, function (a, b) {
                return (a.nodeName || "").localeCompare((b.nodeName || ""), "zh-Hans-CN");
            });
        },

        onSortParallelGroupByRole: function (oEvent) {
            var oGroup = oEvent.getSource().getBindingContext("processDisplay").getObject();
            if (!oGroup || !oGroup.groupId) {
                return;
            }

            this._sortParallelGroupNodes(oGroup.groupId, function (a, b) {
                var sRoleCompare = (a.assigneeRole || "").localeCompare((b.assigneeRole || ""), "zh-Hans-CN");
                if (sRoleCompare !== 0) {
                    return sRoleCompare;
                }
                return (a.nodeName || "").localeCompare((b.nodeName || ""), "zh-Hans-CN");
            });
        },

        onRestoreParallelGroupOrder: function (oEvent) {
            var oGroup = oEvent.getSource().getBindingContext("processDisplay").getObject();
            if (!oGroup || !oGroup.groupId) {
                return;
            }

            this._sortParallelGroupNodes(oGroup.groupId, function (a, b) {
                var bAHasOrigin = typeof a.__originIndex === "number";
                var bBHasOrigin = typeof b.__originIndex === "number";

                if (bAHasOrigin && bBHasOrigin) {
                    return a.__originIndex - b.__originIndex;
                }
                if (bAHasOrigin) {
                    return -1;
                }
                if (bBHasOrigin) {
                    return 1;
                }
                return 0;
            });
        },

        _buildDefaultNode: function (iIndex) {
            return { nodeId: "N" + (iIndex + 1), nodeName: "", nodeType: "审批节点", nodeAction: "", assigneeRole: "", nodePolicy: "REQUIRED", nodeParallelGroup: "", nodeBranchSet: "", nodeBranchGroup: "", nodeBranchMergeTo: "", nodeConditionField: "", nodeConditionOperator: "", nodeConditionValue: "", nodeConditionIsDefault: false, __originIndex: null, sla: "1" };
        },

        _buildDefaultApprovalTemplateNodes: function () {
            return [
                { nodeId: "N1", nodeName: this._getI18nText("processNodeTemplateStart"), nodeType: "发起节点", nodeAction: this._getI18nText("processNodeTemplateStartAction"), assigneeRole: "", nodePolicy: "REQUIRED", nodeParallelGroup: "", nodeBranchSet: "", nodeBranchGroup: "", nodeBranchMergeTo: "", nodeConditionField: "", nodeConditionOperator: "", nodeConditionValue: "", nodeConditionIsDefault: false, __originIndex: null, sla: "0.5" },
                { nodeId: "N2", nodeName: this._getI18nText("processNodeTemplateSubmit"), nodeType: "提交节点", nodeAction: this._getI18nText("processNodeTemplateSubmitAction"), assigneeRole: "", nodePolicy: "REQUIRED", nodeParallelGroup: "", nodeBranchSet: "", nodeBranchGroup: "", nodeBranchMergeTo: "", nodeConditionField: "", nodeConditionOperator: "", nodeConditionValue: "", nodeConditionIsDefault: false, __originIndex: null, sla: "0.5" },
                { nodeId: "N3", nodeName: this._getI18nText("processNodeTemplateApprove"), nodeType: "审批节点", nodeAction: this._getI18nText("processNodeTemplateApproveAction"), assigneeRole: "", nodePolicy: "REQUIRED", nodeParallelGroup: "", nodeBranchSet: "", nodeBranchGroup: "", nodeBranchMergeTo: "", nodeConditionField: "", nodeConditionOperator: "", nodeConditionValue: "", nodeConditionIsDefault: false, __originIndex: null, sla: "1" },
                { nodeId: "N4", nodeName: this._getI18nText("processNodeTemplateEnd"), nodeType: "结束节点", nodeAction: this._getI18nText("processNodeTemplateEndAction"), assigneeRole: "系统", nodePolicy: "REQUIRED", nodeParallelGroup: "", nodeBranchSet: "", nodeBranchGroup: "", nodeBranchMergeTo: "", nodeConditionField: "", nodeConditionOperator: "", nodeConditionValue: "", nodeConditionIsDefault: false, __originIndex: null, sla: "0.2" }
            ];
        },

        onNodePolicyChange: function (oEvent) {
            var oDisplayModel = this.getView().getModel("processDisplay");
            var aNodes = oDisplayModel.getProperty("/editingNodes") || [];
            var iIndex = this._getNodeIndexFromEvent(oEvent);
            if (isNaN(iIndex) || iIndex < 0 || iIndex >= aNodes.length) {
                return;
            }

            if (aNodes[iIndex].nodePolicy === "PARALLEL") {
                aNodes[iIndex].nodeParallelGroup = aNodes[iIndex].nodeParallelGroup || "PG1";
                aNodes[iIndex].nodeBranchSet = "";
                aNodes[iIndex].nodeBranchGroup = "";
                aNodes[iIndex].nodeBranchMergeTo = "";
                aNodes[iIndex].nodeConditionField = "";
                aNodes[iIndex].nodeConditionOperator = "";
                aNodes[iIndex].nodeConditionValue = "";
                aNodes[iIndex].nodeConditionIsDefault = false;
            } else if (aNodes[iIndex].nodePolicy === "CONDITIONAL") {
                var oFormConfig = this._getEditingFormConfig();
                aNodes[iIndex].nodeParallelGroup = "";
                aNodes[iIndex].nodeBranchSet = aNodes[iIndex].nodeBranchSet || "";
                aNodes[iIndex].nodeBranchGroup = aNodes[iIndex].nodeBranchGroup || "";
                aNodes[iIndex].nodeBranchMergeTo = aNodes[iIndex].nodeBranchMergeTo || "";
                aNodes[iIndex].nodeConditionIsDefault = !!aNodes[iIndex].nodeConditionIsDefault;
                aNodes[iIndex].nodeConditionField = aNodes[iIndex].nodeConditionIsDefault ? "" : (aNodes[iIndex].nodeConditionField || this._getDefaultConditionField(oFormConfig));
                aNodes[iIndex].nodeConditionOperator = aNodes[iIndex].nodeConditionIsDefault ? "" : (aNodes[iIndex].nodeConditionOperator || "EQ");
                aNodes[iIndex].nodeConditionValue = aNodes[iIndex].nodeConditionIsDefault ? "" : (aNodes[iIndex].nodeConditionValue || "");
            } else {
                aNodes[iIndex].nodeParallelGroup = "";
                aNodes[iIndex].nodeBranchSet = "";
                aNodes[iIndex].nodeBranchGroup = "";
                aNodes[iIndex].nodeBranchMergeTo = "";
                aNodes[iIndex].nodeConditionField = "";
                aNodes[iIndex].nodeConditionOperator = "";
                aNodes[iIndex].nodeConditionValue = "";
                aNodes[iIndex].nodeConditionIsDefault = false;
            }

            this._setEditingNodes(aNodes, false);
        },

        onConditionalDefaultChange: function (oEvent) {
            var oDisplayModel = this.getView().getModel("processDisplay");
            var aNodes = oDisplayModel.getProperty("/editingNodes") || [];
            var iIndex = this._getNodeIndexFromEvent(oEvent);
            if (isNaN(iIndex) || iIndex < 0 || iIndex >= aNodes.length) {
                return;
            }

            aNodes[iIndex].nodeConditionIsDefault = !!oEvent.getParameter("selected");
            if (aNodes[iIndex].nodeConditionIsDefault) {
                aNodes[iIndex].nodeConditionField = "";
                aNodes[iIndex].nodeConditionOperator = "";
                aNodes[iIndex].nodeConditionValue = "";
            } else {
                aNodes[iIndex].nodeConditionField = aNodes[iIndex].nodeConditionField || this._getDefaultConditionField(this._getEditingFormConfig());
                aNodes[iIndex].nodeConditionOperator = aNodes[iIndex].nodeConditionOperator || "EQ";
            }

            this._setEditingNodes(aNodes, false);
        },

        onAutoInferBranchMergeTargets: function () {
            var oDisplayModel = this.getView().getModel("processDisplay");
            var aNodes = oDisplayModel.getProperty("/editingNodes") || [];
            var mSetEndIndex = {};
            var mSetMergeTarget = {};
            var iInferred = 0;
            var iUnresolved = 0;

            aNodes.forEach(function (oNode, iIndex) {
                if (oNode.nodePolicy !== "CONDITIONAL" || !oNode.nodeBranchSet) {
                    return;
                }
                mSetEndIndex[oNode.nodeBranchSet] = Math.max(mSetEndIndex[oNode.nodeBranchSet] || -1, iIndex);
            });

            Object.keys(mSetEndIndex).forEach(function (sSetId) {
                var iStart = mSetEndIndex[sSetId] + 1;
                var sTarget = "";

                for (var i = iStart; i < aNodes.length; i += 1) {
                    var oCandidate = aNodes[i];
                    if (!(oCandidate.nodePolicy === "CONDITIONAL" && oCandidate.nodeBranchSet === sSetId)) {
                        sTarget = oCandidate.nodeId;
                        break;
                    }
                }

                if (sTarget) {
                    mSetMergeTarget[sSetId] = sTarget;
                    iInferred += 1;
                } else {
                    iUnresolved += 1;
                }
            });

            if (!iInferred && !iUnresolved) {
                MessageToast.show(this._getI18nText("processBranchMergeAutoInferNone"));
                return;
            }

            aNodes = aNodes.map(function (oNode) {
                if (oNode.nodePolicy === "CONDITIONAL" && oNode.nodeBranchSet && mSetMergeTarget[oNode.nodeBranchSet]) {
                    return Object.assign({}, oNode, {
                        nodeBranchMergeTo: mSetMergeTarget[oNode.nodeBranchSet]
                    });
                }
                return oNode;
            });

            this._setEditingNodes(aNodes, false);
            MessageToast.show(this._getI18nText("processBranchMergeAutoInferResult", [String(iInferred), String(iUnresolved)]));
        },

        _getNodeIndexFromEvent: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("processDisplay");
            return parseInt(oCtx.getPath().split("/").pop(), 10);
        },

        onFormChanged: function () {
            var oDisplayModel = this.getView().getModel("processDisplay");
            var aNodes = oDisplayModel.getProperty("/editingNodes") || [];
            this._refreshConditionFieldOptions();
            this._setEditingNodes(aNodes, true);
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
            this._setEditingNodes(aNodes, false);
        },

        onAddNode: function () {
            var oDisplayModel = this.getView().getModel("processDisplay");
            var aNodes = oDisplayModel.getProperty("/editingNodes") || [];
            aNodes.push(this._buildDefaultNode(aNodes.length));
            this._setEditingNodes(aNodes, false);
        },

        _insertNodeAt: function (iTargetIndex) {
            var oDisplayModel = this.getView().getModel("processDisplay");
            var aNodes = oDisplayModel.getProperty("/editingNodes") || [];
            var iSafeIndex = Math.max(0, Math.min(iTargetIndex, aNodes.length));
            aNodes.splice(iSafeIndex, 0, this._buildDefaultNode(aNodes.length));
            this._setEditingNodes(aNodes, false);
        },

        onInsertNodeBefore: function (oEvent) {
            var iIndex = this._getNodeIndexFromEvent(oEvent);
            if (!isNaN(iIndex) && iIndex >= 0) {
                this._insertNodeAt(iIndex);
            }
        },

        onInsertNodeAfter: function (oEvent) {
            var iIndex = this._getNodeIndexFromEvent(oEvent);
            if (!isNaN(iIndex) && iIndex >= 0) {
                this._insertNodeAt(iIndex + 1);
            }
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
            this._setEditingNodes(aNodes, false);
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
            this._setEditingNodes(aNodes, false);
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
                nodeName: (oSourceNode.nodeName || "") + this._getI18nText("processNodeCopySuffix"),
                __originIndex: null
            });
            aNodes.splice(iIndex + 1, 0, oClonedNode);
            this._setEditingNodes(aNodes, false);
        },

        onDeleteNode: function (oEvent) {
            var oDisplayModel = this.getView().getModel("processDisplay");
            var aNodes = oDisplayModel.getProperty("/editingNodes") || [];
            var iIndex = this._getNodeIndexFromEvent(oEvent);
            if (!isNaN(iIndex) && iIndex >= 0) {
                aNodes.splice(iIndex, 1);
                this._setEditingNodes(aNodes, false);
            }
        },

        onApplyNodeTemplate: function () {
            var oDisplayModel = this.getView().getModel("processDisplay");
            var aCurrentNodes = oDisplayModel.getProperty("/editingNodes") || [];
            var fnApply = function () {
                this._setEditingNodes(this._buildDefaultApprovalTemplateNodes(), false);
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

        onSave: function () {
            var oDisplayModel = this.getView().getModel("processDisplay");
            var oDraft = Object.assign({}, oDisplayModel.getProperty("/editingModel"));
            var aEditingNodes = this._autoAssignConditionalBranchIdentifiers(this._applyDefaultRolesToNodes(this._normalizeNodeIds(oDisplayModel.getProperty("/editingNodes") || []), false)).map(function (oNode, iIndex) {
                return {
                    nodeId: oNode.nodeId || ("N" + (iIndex + 1)),
                    nodeName: oNode.nodeName || "",
                    nodeType: oNode.nodeType || "审批节点",
                    nodeAction: oNode.nodeAction || "",
                    assigneeRole: oNode.assigneeRole || "",
                    nodePolicy: oNode.nodePolicy || "REQUIRED",
                    nodeParallelGroup: oNode.nodePolicy === "PARALLEL" ? (oNode.nodeParallelGroup || "") : "",
                    nodeBranchSet: oNode.nodePolicy === "CONDITIONAL" ? (oNode.nodeBranchSet || "") : "",
                    nodeBranchGroup: oNode.nodePolicy === "CONDITIONAL" ? (oNode.nodeBranchGroup || "") : "",
                    nodeBranchMergeTo: oNode.nodePolicy === "CONDITIONAL" ? (oNode.nodeBranchMergeTo || "") : "",
                    nodeConditionField: oNode.nodePolicy === "CONDITIONAL" ? (oNode.nodeConditionField || "") : "",
                    nodeConditionOperator: oNode.nodePolicy === "CONDITIONAL" ? (oNode.nodeConditionOperator || "") : "",
                    nodeConditionValue: oNode.nodePolicy === "CONDITIONAL" ? (oNode.nodeConditionValue || "") : "",
                    nodeConditionIsDefault: oNode.nodePolicy === "CONDITIONAL" ? !!oNode.nodeConditionIsDefault : false,
                    sla: oNode.sla || "1"
                };
            });
            var bIsCreate = !!oDisplayModel.getProperty("/isCreate");
            var sSourceId = oDisplayModel.getProperty("/editingSourceId");

            if (!oDraft.id || !oDraft.name || !oDraft.formId) {
                MessageToast.show(this._getI18nText("processModelRequired"));
                return;
            }
            if (aEditingNodes.some(function (oNode) {
                return !oNode.nodeName || !oNode.nodeType || !oNode.assigneeRole;
            })) {
                MessageToast.show(this._getI18nText("processNodeRequired"));
                return;
            }
            if (aEditingNodes.some(function (oNode) {
                return oNode.nodePolicy === "PARALLEL" && !oNode.nodeParallelGroup;
            })) {
                MessageToast.show(this._getI18nText("processNodeParallelGroupRequired"));
                return;
            }
            if (aEditingNodes.some(function (oNode) {
                return oNode.nodePolicy === "CONDITIONAL" && (!oNode.nodeBranchSet || !oNode.nodeBranchGroup);
            })) {
                MessageToast.show(this._getI18nText("processNodeBranchSetRequired"));
                return;
            }
            if (aEditingNodes.some(function (oNode) {
                return oNode.nodePolicy === "CONDITIONAL" && !oNode.nodeConditionIsDefault && (!oNode.nodeConditionField || !oNode.nodeConditionOperator || oNode.nodeConditionValue === "");
            })) {
                MessageToast.show(this._getI18nText("processNodeConditionRequired"));
                return;
            }
            if (aEditingNodes.some(function (oNode) {
                return oNode.nodePolicy === "CONDITIONAL" && !oNode.nodeBranchMergeTo;
            })) {
                MessageToast.show(this._getI18nText("processNodeBranchMergeRequired"));
                return;
            }
            var mDefaultBranchCount = {};
            var mBranchMergeTarget = {};
            aEditingNodes.forEach(function (oNode) {
                if (oNode.nodePolicy === "CONDITIONAL" && oNode.nodeConditionIsDefault && oNode.nodeBranchSet) {
                    mDefaultBranchCount[oNode.nodeBranchSet] = (mDefaultBranchCount[oNode.nodeBranchSet] || 0) + 1;
                }
                if (oNode.nodePolicy === "CONDITIONAL" && oNode.nodeBranchSet && oNode.nodeBranchGroup) {
                    var sBranchKey = oNode.nodeBranchSet + "::" + oNode.nodeBranchGroup;
                    if (!mBranchMergeTarget[sBranchKey]) {
                        mBranchMergeTarget[sBranchKey] = oNode.nodeBranchMergeTo || "";
                    }
                }
            });
            if (Object.keys(mDefaultBranchCount).some(function (sSetId) { return mDefaultBranchCount[sSetId] > 1; })) {
                MessageToast.show(this._getI18nText("processNodeDefaultBranchUnique"));
                return;
            }
            if (aEditingNodes.some(function (oNode) {
                if (oNode.nodePolicy !== "CONDITIONAL" || !oNode.nodeBranchSet || !oNode.nodeBranchGroup) {
                    return false;
                }
                var sBranchKey = oNode.nodeBranchSet + "::" + oNode.nodeBranchGroup;
                return mBranchMergeTarget[sBranchKey] !== (oNode.nodeBranchMergeTo || "");
            })) {
                MessageToast.show(this._getI18nText("processNodeBranchMergeConsistent"));
                return;
            }

            var oProcessModel = this.getView().getModel("process");
            var aProcessModels = oProcessModel.getProperty("/processModels") || [];
            var aFormConfigs = oProcessModel.getProperty("/formConfigs") || [];
            var aNodes = oProcessModel.getProperty("/processNodes") || [];
            var oLinkedForm = aFormConfigs.find(function (oForm) { return oForm.id === oDraft.formId; });
            oDraft.version = this._getNextAutoVersion(oDraft.version, bIsCreate);
            oDisplayModel.setProperty("/editingModel/version", oDraft.version);

            if (bIsCreate) {
                if (aProcessModels.some(function (oItem) { return oItem.id === oDraft.id; })) {
                    MessageToast.show(this._getI18nText("processModelIdExists"));
                    return;
                }
                aProcessModels.push({
                    id: oDraft.id,
                    name: oDraft.name,
                    categoryName: "审批流程",
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
            MessageToast.show(this._getI18nText("saveSuccess"));
            this.onNavBack();
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteProcessModels");
        }
    });
});
