sap.ui.define([
    "myapp/model/apiClient"
], function (apiClient) {
    "use strict";

    function parseSchemaJson(sSchemaJson) {
        if (!sSchemaJson) {
            return {};
        }
        try {
            var oParsed = JSON.parse(sSchemaJson);
            return (oParsed && typeof oParsed === "object") ? oParsed : {};
        } catch (e) {
            return {};
        }
    }

    function buildSchemaJson(oFormLike) {
        var aFields = String(oFormLike.fieldsText || "")
            .split(/[，,]/)
            .map(function (sItem) { return sItem.trim(); })
            .filter(function (sItem) { return !!sItem; });

        return JSON.stringify({
            businessObject: String(oFormLike.businessObject || "").trim(),
            initiatorRole: String(oFormLike.initiatorRole || "").trim(),
            approverRole: String(oFormLike.approverRole || "").trim(),
            fields: aFields
        });
    }

    function mapModelStatusToUi(sStatus) {
        if (sStatus === "ACTIVE") {
            return "PUBLISHED";
        }
        if (sStatus === "ARCHIVED") {
            return "ARCHIVED";
        }
        return "TESTING";
    }

    function mapModelStatusToApi(sStatus) {
        if (sStatus === "PUBLISHED") {
            return "ACTIVE";
        }
        if (sStatus === "ARCHIVED") {
            return "ARCHIVED";
        }
        return "DRAFT";
    }

    function mapCategory(oItem) {
        return {
            id: oItem.id,
            name: oItem.name || "",
            description: oItem.description || "",
            owner: "",
            status: oItem.status || "ACTIVE"
        };
    }

    function mapForm(oItem) {
        var oSchema = parseSchemaJson(oItem.schemaJson);
        var aFields = Array.isArray(oSchema.fields) ? oSchema.fields : [];
        var sCategoryName = (oItem.category && oItem.category.name) || "";

        return {
            id: oItem.id,
            name: oItem.name || "",
            categoryId: oItem.categoryId || "",
            categoryName: sCategoryName,
            businessObject: oSchema.businessObject || "",
            initiatorRole: oSchema.initiatorRole || "",
            approverRole: oSchema.approverRole || "",
            fields: aFields,
            fieldsText: aFields.join(", "),
            schemaJson: oItem.schemaJson || "",
            status: oItem.status || "ACTIVE"
        };
    }

    function mapProcessModel(oItem) {
        var oForm = oItem.form || {};
        var oCategory = oForm.category || {};

        return {
            id: oItem.id,
            name: oItem.name || "",
            categoryId: oCategory.id || "",
            categoryName: oCategory.name || "",
            formId: oItem.formId || "",
            formName: oForm.name || "",
            version: oItem.version || "v1",
            status: mapModelStatusToUi(oItem.status),
            description: "",
            businessObject: "",
            initiatorRole: "",
            approverRole: "",
            nodeCount: 0
        };
    }

    function mapDeployment(oItem) {
        var oModel = oItem.model || {};
        var oForm = oModel.form || {};
        var oCategory = oForm.category || {};

        return {
            backendId: oItem.id,
            id: oItem.deploymentId || "",
            modelId: oItem.modelId || "",
            modelName: oModel.name || "",
            formId: oForm.id || "",
            formName: oForm.name || "",
            linkedProcess: oCategory.name || "",
            environment: oItem.environment || "",
            scope: oCategory.name || "",
            deployTime: oItem.deployTime ? new Date(oItem.deployTime).toISOString().slice(0, 16).replace("T", " ") : "",
            publishedBy: oItem.publishedBy || "",
            status: oItem.status || "PUBLISHED",
            linkState: oModel.id ? "Success" : "Error",
            linkText: oModel.id ? "关联正常" : "关联异常"
        };
    }

    function refreshProcessModel(oProcessModel) {
        return Promise.all([
            apiClient.request("/api/process/categories"),
            apiClient.request("/api/process/forms"),
            apiClient.request("/api/process/models"),
            apiClient.request("/api/process/deployments")
        ]).then(function (aResults) {
            var aCategories = Array.isArray(aResults[0]) ? aResults[0].map(mapCategory) : [];
            var aForms = Array.isArray(aResults[1]) ? aResults[1].map(mapForm) : [];
            var aModels = Array.isArray(aResults[2]) ? aResults[2].map(mapProcessModel) : [];
            var aDeployments = Array.isArray(aResults[3]) ? aResults[3].map(mapDeployment) : [];

            oProcessModel.setProperty("/processCategories", aCategories);
            oProcessModel.setProperty("/formConfigs", aForms);
            oProcessModel.setProperty("/processModels", aModels);
            oProcessModel.setProperty("/deployments", aDeployments);
            oProcessModel.refresh(true);

            return {
                categories: aCategories,
                forms: aForms,
                models: aModels,
                deployments: aDeployments
            };
        });
    }

    return {
        refreshProcessModel: refreshProcessModel,
        buildFormSchemaJson: buildSchemaJson,
        mapModelStatusToApi: mapModelStatusToApi
    };
});
