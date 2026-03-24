sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device"
], function (JSONModel, Device) {
    "use strict";

    return {

        createDeviceModel: function () {
            var oModel = new JSONModel(Device);
            oModel.setDefaultBindingMode("OneWay");
            return oModel;
        },

        createSupplierModel: function () {
            var oData = {
                suppliers: [
                    { id: "SUP001", name: "ABC Supplies", taxNumber: "123456789", address: "123 Main St, City A", contact: "123-456-7890", email: "contact@abc.com" },
                    { id: "SUP002", name: "XYZ Corp", taxNumber: "987654321", address: "456 Elm St, City B", contact: "987-654-3210", email: "info@xyz.com" },
                    { id: "SUP003", name: "Global Traders", taxNumber: "111222333", address: "789 Oak St, City C", contact: "111-222-3333", email: "sales@global.com" },
                    { id: "SUP004", name: "Tech Solutions", taxNumber: "444555666", address: "101 Pine St, City D", contact: "444-555-6666", email: "support@tech.com" },
                    { id: "SUP005", name: "Build Masters", taxNumber: "777888999", address: "202 Maple St, City E", contact: "777-888-9999", email: "build@masters.com" },
                    { id: "SUP006", name: "Food Essentials", taxNumber: "000111222", address: "303 Birch St, City F", contact: "000-111-2222", email: "orders@essentials.com" },
                    { id: "SUP007", name: "Auto Parts Inc", taxNumber: "333444555", address: "404 Cedar St, City G", contact: "333-444-5555", email: "parts@auto.com" },
                    { id: "SUP008", name: "Fashion Hub", taxNumber: "666777888", address: "505 Walnut St, City H", contact: "666-777-8888", email: "fashion@hub.com" },
                    { id: "SUP009", name: "Health Supplies", taxNumber: "999000111", address: "606 Spruce St, City I", contact: "999-000-1111", email: "health@supplies.com" },
                    { id: "SUP010", name: "Office Depot", taxNumber: "222333444", address: "707 Ash St, City J", contact: "222-333-4444", email: "office@depot.com" },
                    { id: "SUP011", name: "Green Energy", taxNumber: "555666777", address: "808 Fir St, City K", contact: "555-666-7777", email: "green@energy.com" },
                    { id: "SUP012", name: "Media Services", taxNumber: "888999000", address: "909 Poplar St, City L", contact: "888-999-0000", email: "media@services.com" }
                ],
                newSuppliersCount: 5
            };
            return new JSONModel(oData);
        },

        createMaterialModel: function () {
            var oData = {
                materials: [
                    { id: "MAT001", name: "钢材", spec: "Q235", unit: "吨", stock: 120 },
                    { id: "MAT002", name: "水泥", spec: "P.O 42.5", unit: "袋", stock: 340 },
                    { id: "MAT003", name: "砂", spec: "中砂", unit: "吨", stock: 210 },
                    { id: "MAT004", name: "电缆", spec: "3×2.5mm²", unit: "卷", stock: 75 },
                    { id: "MAT005", name: "油漆", spec: "环氧", unit: "桶", stock: 64 },
                    { id: "MAT006", name: "木方", spec: "50×100", unit: "米", stock: 380 },
                    { id: "MAT007", name: "玻璃", spec: "5mm", unit: "片", stock: 450 },
                    { id: "MAT008", name: "螺栓", spec: "M12", unit: "箱", stock: 560 },
                    { id: "MAT009", name: "管道", spec: "Φ50", unit: "米", stock: 120 },
                    { id: "MAT010", name: "绝缘材料", spec: "PVC", unit: "卷", stock: 220 }
                ]
            };
            return new JSONModel(oData);
        },

        createPriceLibraryModel: function () {
            var oData = {
                priceRecords: [
                    {
                        id: "PR001",
                        supplierId: "SUP001",
                        supplierName: "ABC Supplies",
                        materialId: "MAT001",
                        materialName: "钢材",
                        unit: "吨",
                        validFrom: "2026-01-01",
                        validTo: "2026-03-31",
                        unitPrice: 4280,
                        currency: "CNY",
                        taxRate: 13,
                        remark: "Q1框架协议价"
                    },
                    {
                        id: "PR002",
                        supplierId: "SUP001",
                        supplierName: "ABC Supplies",
                        materialId: "MAT007",
                        materialName: "玻璃",
                        unit: "片",
                        validFrom: "2026-02-01",
                        validTo: "2026-04-30",
                        unitPrice: 86,
                        currency: "CNY",
                        taxRate: 13,
                        remark: "月度执行价"
                    },
                    {
                        id: "PR003",
                        supplierId: "SUP002",
                        supplierName: "XYZ Corp",
                        materialId: "MAT002",
                        materialName: "水泥",
                        unit: "袋",
                        validFrom: "2026-02-15",
                        validTo: "2026-03-31",
                        unitPrice: 32,
                        currency: "CNY",
                        taxRate: 13,
                        remark: "区域集采价"
                    },
                    {
                        id: "PR004",
                        supplierId: "SUP002",
                        supplierName: "XYZ Corp",
                        materialId: "MAT008",
                        materialName: "螺栓",
                        unit: "箱",
                        validFrom: "2026-03-01",
                        validTo: "2026-06-30",
                        unitPrice: 145,
                        currency: "CNY",
                        taxRate: 13,
                        remark: "季度锁价"
                    },
                    {
                        id: "PR005",
                        supplierId: "SUP003",
                        supplierName: "Global Traders",
                        materialId: "MAT003",
                        materialName: "砂",
                        unit: "吨",
                        validFrom: "2026-03-01",
                        validTo: "2026-03-31",
                        unitPrice: 118,
                        currency: "CNY",
                        taxRate: 9,
                        remark: "现货价"
                    },
                    {
                        id: "PR006",
                        supplierId: "SUP003",
                        supplierName: "Global Traders",
                        materialId: "MAT009",
                        materialName: "管道",
                        unit: "米",
                        validFrom: "2026-03-10",
                        validTo: "2026-05-31",
                        unitPrice: 54,
                        currency: "CNY",
                        taxRate: 13,
                        remark: "重点项目价"
                    },
                    {
                        id: "PR007",
                        supplierId: "SUP004",
                        supplierName: "Tech Solutions",
                        materialId: "MAT004",
                        materialName: "电缆",
                        unit: "卷",
                        validFrom: "2026-03-01",
                        validTo: "2026-04-15",
                        unitPrice: 620,
                        currency: "CNY",
                        taxRate: 13,
                        remark: "含运包干价"
                    },
                    {
                        id: "PR008",
                        supplierId: "SUP004",
                        supplierName: "Tech Solutions",
                        materialId: "MAT010",
                        materialName: "绝缘材料",
                        unit: "卷",
                        validFrom: "2026-03-01",
                        validTo: "2026-04-30",
                        unitPrice: 210,
                        currency: "CNY",
                        taxRate: 13,
                        remark: "框架协议价"
                    },
                    {
                        id: "PR009",
                        supplierId: "SUP005",
                        supplierName: "Build Masters",
                        materialId: "MAT005",
                        materialName: "油漆",
                        unit: "桶",
                        validFrom: "2026-02-20",
                        validTo: "2026-03-20",
                        unitPrice: 265,
                        currency: "CNY",
                        taxRate: 13,
                        remark: "阶段促销价"
                    },
                    {
                        id: "PR010",
                        supplierId: "SUP006",
                        supplierName: "Food Essentials",
                        materialId: "MAT006",
                        materialName: "木方",
                        unit: "米",
                        validFrom: "2026-03-01",
                        validTo: "2026-06-30",
                        unitPrice: 18,
                        currency: "CNY",
                        taxRate: 13,
                        remark: "长期合作价"
                    }
                ]
            };
            return new JSONModel(oData);
        },

        createPurchaseOrderModel: function () {
            var oData = {
                purchaseOrders: [
                    { id: "PO001", vendor: "ABC Supplies", date: "2026-03-01", status: "已下单", materialId: "MAT001", supplierId: "SUP001", quantity: 12 },
                    { id: "PO002", vendor: "XYZ Corp", date: "2026-03-05", status: "已收货", materialId: "MAT002", supplierId: "SUP002", quantity: 300 },
                    { id: "PO003", vendor: "Global Traders", date: "2026-03-08", status: "处理中", materialId: "MAT003", supplierId: "SUP003", quantity: 80 },
                    { id: "PO004", vendor: "Tech Solutions", date: "2026-03-10", status: "已下单", materialId: "MAT004", supplierId: "SUP004", quantity: 15 },
                    { id: "PO005", vendor: "Build Masters", date: "2026-03-12", status: "已取消", materialId: "MAT005", supplierId: "SUP005", quantity: 40 },
                    { id: "PO006", vendor: "Food Essentials", date: "2026-03-14", status: "已下单", materialId: "MAT006", supplierId: "SUP006", quantity: 500 },
                    { id: "PO007", vendor: "ABC Supplies", date: "2026-03-15", status: "已收货", materialId: "MAT007", supplierId: "SUP001", quantity: 120 },
                    { id: "PO008", vendor: "XYZ Corp", date: "2026-03-17", status: "处理中", materialId: "MAT008", supplierId: "SUP002", quantity: 30 },
                    { id: "PO009", vendor: "Global Traders", date: "2026-03-18", status: "已下单", materialId: "MAT009", supplierId: "SUP003", quantity: 260 },
                    { id: "PO010", vendor: "Tech Solutions", date: "2026-03-19", status: "已下单", materialId: "MAT010", supplierId: "SUP004", quantity: 22 }
                ]
            };
            return new JSONModel(oData);
        },

        createDeliveryPlanModel: function () {
            var oData = {
                deliveryPlans: [
                    { id: "DP001", date: "2026-03-20", status: "待发货", purchaseOrderId: "PO001" },
                    { id: "DP002", date: "2026-03-21", status: "已出库", purchaseOrderId: "PO002" },
                    { id: "DP003", date: "2026-03-22", status: "运输中", purchaseOrderId: "PO003" },
                    { id: "DP004", date: "2026-03-23", status: "已送达", purchaseOrderId: "PO004" },
                    { id: "DP005", date: "2026-03-24", status: "待发货", purchaseOrderId: "PO005" },
                    { id: "DP006", date: "2026-03-25", status: "已出库", purchaseOrderId: "PO006" },
                    { id: "DP007", date: "2026-03-26", status: "运输中", purchaseOrderId: "PO007" },
                    { id: "DP008", date: "2026-03-27", status: "已送达", purchaseOrderId: "PO008" },
                    { id: "DP009", date: "2026-03-28", status: "待发货", purchaseOrderId: "PO009" },
                    { id: "DP010", date: "2026-03-29", status: "已出库", purchaseOrderId: "PO010" }
                ]
            };
            return new JSONModel(oData);
        },

        createInvoiceModel: function () {
            var oData = {
                invoices: [
                    { id: "INV001", date: "2026-03-05", amount: "12,000", status: "已开票", purchaseOrderId: "PO001", deliveryPlanId: "DP001" },
                    { id: "INV002", date: "2026-03-08", amount: "8,500", status: "待开票", purchaseOrderId: "PO002", deliveryPlanId: "DP002" },
                    { id: "INV003", date: "2026-03-10", amount: "16,200", status: "已开票", purchaseOrderId: "PO003", deliveryPlanId: "DP003" },
                    { id: "INV004", date: "2026-03-12", amount: "4,300", status: "已作废", purchaseOrderId: "PO004", deliveryPlanId: "DP004" },
                    { id: "INV005", date: "2026-03-14", amount: "9,900", status: "待开票", purchaseOrderId: "PO005", deliveryPlanId: "DP005" },
                    { id: "INV006", date: "2026-03-16", amount: "7,600", status: "已开票", purchaseOrderId: "PO006", deliveryPlanId: "DP006" },
                    { id: "INV007", date: "2026-03-18", amount: "5,200", status: "待开票", purchaseOrderId: "PO007", deliveryPlanId: "DP007" },
                    { id: "INV008", date: "2026-03-19", amount: "14,800", status: "已开票", purchaseOrderId: "PO008", deliveryPlanId: "DP008" },
                    { id: "INV009", date: "2026-03-20", amount: "6,400", status: "待开票", purchaseOrderId: "PO009", deliveryPlanId: "DP009" },
                    { id: "INV010", date: "2026-03-21", amount: "11,000", status: "已开票", purchaseOrderId: "PO010", deliveryPlanId: "DP010" }
                ]
            };
            return new JSONModel(oData);
        },

        createUserModel: function () {
            var oSavedUser = null;
            try {
                oSavedUser = JSON.parse(localStorage.getItem("currentUser"));
            } catch (e) {
                oSavedUser = null;
            }

            var oData = {
                users: [
                    { username: "admin", password: "admin", name: "Administrator" },
                    { username: "user1", password: "pass1", name: "User One" }
                ],
                currentUser: oSavedUser || null
            };
            return new JSONModel(oData);
        },

        createDashboardModel: function () {
            var oData = {
                activities: [
                    { title: "新增供应商", description: "ABC Supplies 已添加到系统", icon: "sap-icon://add-employee" },
                    { title: "采购订单已完成", description: "订单 PO001 已交付", icon: "sap-icon://status-completed" },
                    { title: "库存预警", description: "物料 MAT005 库存不足", icon: "sap-icon://alert" },
                    { title: "发票已开出", description: "发票 INV010 已生成", icon: "sap-icon://receipt" },
                    { title: "用户权限变更", description: "User One 权限已更新", icon: "sap-icon://edit" }
                ],
                summaryCards: [
                    { title: "本年度立项总金额", value: "¥0", icon: "sap-icon://document" },
                    { title: "本年度采购合同总金额", value: "¥0", icon: "sap-icon://contract" },
                    { title: "本年度采购开票总金额", value: "¥0", icon: "sap-icon://invoice" },
                    { title: "本年度采购付款总金额", value: "¥0", icon: "sap-icon://money-bills" }
                ],
                myDocuments: [
                    { title: "草稿", value: 0, subTitle: "采购合同" },
                    { title: "签批中", value: 0, subTitle: "采购合同" },
                    { title: "用章批准", value: 74, subTitle: "采购合同" },
                    { title: "待归档", value: 0, subTitle: "采购合同" },
                    { title: "待开票", value: 0, subTitle: "发票" },
                    { title: "部分开票", value: 0, subTitle: "发票" },
                    { title: "待付款", value: 0, subTitle: "付款单" },
                    { title: "待验收", value: 0, subTitle: "验收管理" }
                ],
                topSuppliers: [
                    { name: "ABC Supplies", contacts: 24, value: "¥120,000", status: "活跃", state: "Success" },
                    { name: "XYZ Corp", contacts: 18, value: "¥85,000", status: "活跃", state: "Success" },
                    { name: "Global Traders", contacts: 15, value: "¥68,000", status: "活跃", state: "Success" },
                    { name: "Tech Solutions", contacts: 12, value: "¥54,000", status: "正常", state: "Information" },
                    { name: "Build Masters", contacts: 8, value: "¥32,000", status: "低频", state: "Warning" }
                ]
            };
            return new JSONModel(oData);
        },

        createUserManagementModel: function () {
            var oData = {
                registeredUsers: [
                    {
                        username: "admin",
                        email: "admin@example.com",
                        phone: "13800000001",
                        registrationDate: "2026-02-01",
                        status: "活跃",
                        statusState: "Success",
                        department: "系统管理",
                        role: "系统管理员",
                        lastLogin: "2026-03-20 10:30:15",
                        loginCount: 128,
                        createdBy: "系统"
                    },
                    {
                        username: "user1",
                        email: "user1@example.com",
                        phone: "13800000002",
                        registrationDate: "2026-02-15",
                        status: "活跃",
                        statusState: "Success",
                        department: "采购部",
                        role: "采购员",
                        lastLogin: "2026-03-20 09:45:30",
                        loginCount: 45,
                        createdBy: "admin"
                    },
                    {
                        username: "user2",
                        email: "user2@example.com",
                        phone: "13800000003",
                        registrationDate: "2026-02-20",
                        status: "活跃",
                        statusState: "Success",
                        department: "采购部",
                        role: "采购经理",
                        lastLogin: "2026-03-20 08:20:00",
                        loginCount: 67,
                        createdBy: "admin"
                    },
                    {
                        username: "user3",
                        email: "user3@example.com",
                        phone: "13800000004",
                        registrationDate: "2026-03-01",
                        status: "活跃",
                        statusState: "Success",
                        department: "财务部",
                        role: "财务人员",
                        lastLogin: "2026-03-20 14:15:00",
                        loginCount: 32,
                        createdBy: "admin"
                    },
                    {
                        username: "user4",
                        email: "user4@example.com",
                        phone: "13800000005",
                        registrationDate: "2026-03-05",
                        status: "不活跃",
                        statusState: "Warning",
                        department: "供应链部",
                        role: "供应链协调员",
                        lastLogin: "2026-03-15 16:30:00",
                        loginCount: 18,
                        createdBy: "admin"
                    },
                    {
                        username: "user5",
                        email: "user5@example.com",
                        phone: "13800000006",
                        registrationDate: "2026-03-10",
                        status: "活跃",
                        statusState: "Success",
                        department: "采购部",
                        role: "采购员",
                        lastLogin: "2026-03-20 11:00:30",
                        loginCount: 22,
                        createdBy: "admin"
                    },
                    {
                        username: "user6",
                        email: "user6@example.com",
                        phone: "13800000007",
                        registrationDate: "2026-03-12",
                        status: "活跃",
                        statusState: "Success",
                        department: "财务部",
                        role: "财务经理",
                        lastLogin: "2026-03-20 13:45:15",
                        loginCount: 58,
                        createdBy: "admin"
                    },
                    {
                        username: "user7",
                        email: "user7@example.com",
                        phone: "13800000008",
                        registrationDate: "2026-03-15",
                        status: "禁用",
                        statusState: "Error",
                        department: "市场部",
                        role: "市场专员",
                        lastLogin: "2026-03-18 15:20:00",
                        loginCount: 12,
                        createdBy: "admin"
                    }
                ],
                statistics: {
                    totalUsers: 8,
                    activeUsers: 6,
                    inactiveUsers: 1,
                    thisMonthNewUsers: 5
                }
            };
            return new JSONModel(oData);
        },

        getPriceRecordStatusInfo: function (sValidFrom, sValidTo, sToday) {
            var iToday = Date.parse(sToday || new Date().toISOString().slice(0, 10));
            var iValidFrom = Date.parse(sValidFrom || "");
            var iValidTo = Date.parse(sValidTo || "");

            if (Number.isNaN(iToday) || Number.isNaN(iValidFrom) || Number.isNaN(iValidTo)) {
                return {
                    statusText: "未知",
                    statusState: "None"
                };
            }

            if (iToday < iValidFrom) {
                return {
                    statusText: "未生效",
                    statusState: "Information"
                };
            }

            if (iToday > iValidTo) {
                return {
                    statusText: "已失效",
                    statusState: "Error"
                };
            }

            return {
                statusText: "生效中",
                statusState: "Success"
            };
        },

        annotatePriceLibraryRecords: function (oPriceLibraryModel) {
            if (!oPriceLibraryModel) {
                return;
            }

            var aRecords = oPriceLibraryModel.getProperty("/priceRecords") || [];
            aRecords.forEach(function (oRecord) {
                var oStatus = this.getPriceRecordStatusInfo(oRecord.validFrom, oRecord.validTo);
                oRecord.statusText = oStatus.statusText;
                oRecord.statusState = oStatus.statusState;
            }, this);

            oPriceLibraryModel.refresh(true);
        },

        findEffectivePriceRecord: function (aPriceRecords, sSupplierId, sMaterialId, sOrderDate) {
            var iOrderDate = Date.parse(sOrderDate || "");
            if (!Array.isArray(aPriceRecords) || !sSupplierId || !sMaterialId || Number.isNaN(iOrderDate)) {
                return null;
            }

            var aMatched = aPriceRecords.filter(function (oRecord) {
                var iValidFrom = Date.parse(oRecord.validFrom || "");
                var iValidTo = Date.parse(oRecord.validTo || "");
                return oRecord.supplierId === sSupplierId &&
                    oRecord.materialId === sMaterialId &&
                    !Number.isNaN(iValidFrom) &&
                    !Number.isNaN(iValidTo) &&
                    iOrderDate >= iValidFrom &&
                    iOrderDate <= iValidTo;
            });

            if (!aMatched.length) {
                return null;
            }

            aMatched.sort(function (a, b) {
                return Date.parse(b.validFrom) - Date.parse(a.validFrom);
            });

            return aMatched[0];
        },

        findLowestPriceRecordForMaterial: function (aPriceRecords, sMaterialId, sOrderDate) {
            var iOrderDate = Date.parse(sOrderDate || "");
            if (!Array.isArray(aPriceRecords) || !sMaterialId || Number.isNaN(iOrderDate)) {
                return null;
            }

            var aMatched = aPriceRecords.filter(function (oRecord) {
                var iValidFrom = Date.parse(oRecord.validFrom || "");
                var iValidTo = Date.parse(oRecord.validTo || "");
                return oRecord.materialId === sMaterialId &&
                    !Number.isNaN(iValidFrom) &&
                    !Number.isNaN(iValidTo) &&
                    iOrderDate >= iValidFrom &&
                    iOrderDate <= iValidTo;
            });

            if (!aMatched.length) {
                return null;
            }

            aMatched.sort(function (a, b) {
                return Number(a.unitPrice) - Number(b.unitPrice);
            });

            return aMatched[0];
        },

        syncPurchaseOrderPricing: function (oPurchaseOrderModel, oPriceLibraryModel, oSupplierModel, oMaterialModel) {
            if (!oPurchaseOrderModel || !oPriceLibraryModel || !oSupplierModel || !oMaterialModel) {
                return;
            }

            var aOrders = oPurchaseOrderModel.getProperty("/purchaseOrders") || [];
            var aPrices = oPriceLibraryModel.getProperty("/priceRecords") || [];
            var aSuppliers = oSupplierModel.getProperty("/suppliers") || [];
            var aMaterials = oMaterialModel.getProperty("/materials") || [];

            this.annotatePriceLibraryRecords(oPriceLibraryModel);

            aOrders.forEach(function (oOrder) {
                var oSupplier = aSuppliers.find(function (oItem) {
                    return oItem.id === oOrder.supplierId;
                });
                var oMaterial = aMaterials.find(function (oItem) {
                    return oItem.id === oOrder.materialId;
                });
                var oPrice = this.findEffectivePriceRecord(aPrices, oOrder.supplierId, oOrder.materialId, oOrder.date);
                var oLowestPrice = this.findLowestPriceRecordForMaterial(aPrices, oOrder.materialId, oOrder.date);
                var iQuantity = Number(oOrder.quantity || 0);
                var iLowestPrice = oLowestPrice ? Number(oLowestPrice.unitPrice) : 0;

                oOrder.vendor = oSupplier ? oSupplier.name : (oOrder.vendor || "");
                oOrder.materialName = oMaterial ? oMaterial.name : "";
                oOrder.unit = oMaterial ? oMaterial.unit : (oOrder.unit || "");
                oOrder.unitPrice = oPrice ? Number(oPrice.unitPrice) : 0;
                oOrder.currency = oPrice ? oPrice.currency : "CNY";
                oOrder.priceRecordId = oPrice ? oPrice.id : "";
                oOrder.priceRemark = oPrice ? oPrice.remark : "未匹配到有效价格";
                oOrder.priceValidFrom = oPrice ? oPrice.validFrom : "";
                oOrder.priceValidTo = oPrice ? oPrice.validTo : "";
                oOrder.priceMatched = !!oPrice;
                oOrder.priceStatusText = oPrice ? "已匹配" : "缺失";
                oOrder.priceStatusState = oPrice ? "Success" : "Error";
                oOrder.amount = oPrice ? (iQuantity * Number(oPrice.unitPrice)).toFixed(2) : "0.00";

                oOrder.lowestPriceRecordId = oLowestPrice ? oLowestPrice.id : "";
                oOrder.lowestMarketPrice = oLowestPrice ? iLowestPrice.toFixed(2) : "0.00";
                oOrder.lowestMarketSupplierName = oLowestPrice ? oLowestPrice.supplierName : "";

                if (!oPrice || !oLowestPrice) {
                    oOrder.priceBenchmarkText = "暂无可比价格";
                    oOrder.priceBenchmarkState = "None";
                    return;
                }

                if (Number(oPrice.unitPrice) === iLowestPrice) {
                    oOrder.priceBenchmarkText = "当前为最低价";
                    oOrder.priceBenchmarkState = "Success";
                    return;
                }

                oOrder.priceBenchmarkText = "高于最低价 " + (Number(oPrice.unitPrice) - iLowestPrice).toFixed(2);
                oOrder.priceBenchmarkState = "Warning";
            }, this);

            oPurchaseOrderModel.refresh(true);
        },

        createSystemManagementModel: function () {
            var oData = {
                onlineUsers: 12,
                systemUptime: "45天 3小时 22分钟",
                cpuUsage: "34%",
                cpuUsageValue: 34,
                memoryUsage: "62%",
                memoryUsageValue: 62,
                loginHistory: [
                    {
                        username: "admin",
                        loginTime: "2026-03-20 10:30:15",
                        ipAddress: "192.168.1.100",
                        status: "登录中",
                        statusState: "Success",
                        duration: "2小时 15分钟"
                    },
                    {
                        username: "user1",
                        loginTime: "2026-03-20 09:45:30",
                        ipAddress: "192.168.1.101",
                        status: "已登出",
                        statusState: "Warning",
                        duration: "1小时 30分钟"
                    },
                    {
                        username: "user2",
                        loginTime: "2026-03-20 08:20:00",
                        ipAddress: "192.168.1.102",
                        status: "登录中",
                        statusState: "Success",
                        duration: "5小时 25分钟"
                    },
                    {
                        username: "user3",
                        loginTime: "2026-03-20 07:15:45",
                        ipAddress: "192.168.1.103",
                        status: "已登出",
                        statusState: "Warning",
                        duration: "2小时 10分钟"
                    },
                    {
                        username: "user4",
                        loginTime: "2026-03-19 22:30:00",
                        ipAddress: "192.168.1.104",
                        status: "已登出",
                        statusState: "Warning",
                        duration: "3小时 50分钟"
                    }
                ],
                onlineUsersList: [
                    {
                        username: "admin",
                        loginTime: "2026-03-20 10:30:15",
                        ipAddress: "192.168.1.100",
                        lastActivity: "2026-03-20 11:28:00"
                    },
                    {
                        username: "user2",
                        loginTime: "2026-03-20 08:20:00",
                        ipAddress: "192.168.1.102",
                        lastActivity: "2026-03-20 11:15:30"
                    },
                    {
                        username: "user5",
                        loginTime: "2026-03-20 11:00:00",
                        ipAddress: "192.168.1.105",
                        lastActivity: "2026-03-20 11:25:15"
                    },
                    {
                        username: "user6",
                        loginTime: "2026-03-20 10:15:30",
                        ipAddress: "192.168.1.106",
                        lastActivity: "2026-03-20 11:20:00"
                    },
                    {
                        username: "user7",
                        loginTime: "2026-03-20 09:30:00",
                        ipAddress: "192.168.1.107",
                        lastActivity: "2026-03-20 11:22:45"
                    },
                    {
                        username: "user8",
                        loginTime: "2026-03-20 10:45:00",
                        ipAddress: "192.168.1.108",
                        lastActivity: "2026-03-20 11:18:00"
                    }
                ],
                logLevels: [
                    { id: "all", name: "全部" },
                    { id: "error", name: "错误" },
                    { id: "warning", name: "警告" },
                    { id: "info", name: "信息" },
                    { id: "debug", name: "调试" }
                ],
                systemLogs: [
                    {
                        timestamp: "2026-03-20 11:28:00",
                        level: "信息",
                        levelState: "Information",
                        module: "UserMgmt",
                        message: "用户 admin 登录成功"
                    },
                    {
                        timestamp: "2026-03-20 11:25:15",
                        level: "信息",
                        levelState: "Information",
                        module: "SupplierMgmt",
                        message: "供应商编码 SUP001 数据更新"
                    },
                    {
                        timestamp: "2026-03-20 11:20:00",
                        level: "警告",
                        levelState: "Warning",
                        module: "System",
                        message: "内存使用率达到 62%"
                    },
                    {
                        timestamp: "2026-03-20 11:15:30",
                        level: "信息",
                        levelState: "Information",
                        module: "PurchaseOrder",
                        message: "采购订单 PO001 状态变为已收货"
                    },
                    {
                        timestamp: "2026-03-20 11:10:00",
                        level: "错误",
                        levelState: "Error",
                        module: "Database",
                        message: "数据库连接超时，已自动重试"
                    },
                    {
                        timestamp: "2026-03-20 11:05:45",
                        level: "信息",
                        levelState: "Information",
                        module: "Invoice",
                        message: "发票 INV001 已开票"
                    },
                    {
                        timestamp: "2026-03-20 11:00:00",
                        level: "信息",
                        levelState: "Information",
                        module: "UserMgmt",
                        message: "用户 user5 登录成功"
                    },
                    {
                        timestamp: "2026-03-20 10:55:30",
                        level: "警告",
                        levelState: "Warning",
                        module: "System",
                        message: "磁盘空间使用率达到 85%"
                    }
                ]
            };
            return new JSONModel(oData);
        },

        createProcessManagementModel: function () {
            var oData = {
                processCategories: [
                    { id: "pc1", name: "采购流程" },
                    { id: "pc2", name: "审批流程" },
                    { id: "pc3", name: "出库流程" },
                    { id: "pc4", name: "报销流程" }
                ],
                formConfigs: [
                    { id: "f1", name: "采购单表单", fields: ["物料", "数量", "供应商", "价格"] },
                    { id: "f2", name: "报销单表单", fields: ["金额", "类别", "说明", "附件"] },
                    { id: "f3", name: "请假单表单", fields: ["开始时间", "结束时间", "请假类型", "原因"] }
                ],
                processModels: [
                    { id: "pm1", name: "采购审批模型", version: "1.0", status: "已发布" },
                    { id: "pm2", name: "报销审批模型", version: "1.1", status: "测试中" },
                    { id: "pm3", name: "出库审批模型", version: "1.0", status: "已发布" }
                ],
                deployments: [
                    { id: "d1", modelName: "采购审批模型", deployTime: "2026-04-01 10:00", status: "成功" },
                    { id: "d2", modelName: "报销审批模型", deployTime: "2026-04-05 13:20", status: "成功" },
                    { id: "d3", modelName: "出库审批模型", deployTime: "2026-04-08 09:10", status: "失败" }
                ]
            };
            return new JSONModel(oData);
        }

    };
});