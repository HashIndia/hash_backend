import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";

// Revenue Analytics
export const getRevenueAnalytics = catchAsync(async (req, res, next) => {
  const { period = "30d" } = req.query;

  let startDate;
  const endDate = new Date();

  switch (period) {
    case "7d":
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "1y":
      startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }

  // Revenue analytics
  const revenueData = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $ne: "cancelled" },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        },
        revenue: { $sum: "$totalAmount" },
        orders: { $sum: 1 },
        avgOrderValue: { $avg: "$totalAmount" },
      },
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
    },
  ]);

  // Total revenue and growth
  const totalRevenue = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $ne: "cancelled" },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$totalAmount" },
        count: { $sum: 1 },
        avgOrderValue: { $avg: "$totalAmount" },
      },
    },
  ]);

  // Previous period for comparison
  const prevStartDate = new Date(
    startDate.getTime() - (endDate.getTime() - startDate.getTime())
  );
  const prevRevenue = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: prevStartDate, $lt: startDate },
        status: { $ne: "cancelled" },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$totalAmount" },
        count: { $sum: 1 },
      },
    },
  ]);

  const currentTotal = totalRevenue[0]?.total || 0;
  const previousTotal = prevRevenue[0]?.total || 0;
  const growth =
    previousTotal > 0
      ? ((currentTotal - previousTotal) / previousTotal) * 100
      : 0;

  res.status(200).json({
    status: "success",
    data: {
      period,
      totalRevenue: currentTotal,
      totalOrders: totalRevenue[0]?.count || 0,
      avgOrderValue: totalRevenue[0]?.avgOrderValue || 0,
      growth: Math.round(growth * 100) / 100,
      dailyData: revenueData,
    },
  });
});

// Customer Analytics
export const getCustomerAnalytics = catchAsync(async (req, res, next) => {
  const { period = "30d" } = req.query;

  let startDate;
  const endDate = new Date();

  switch (period) {
    case "7d":
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "1y":
      startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }

  // Customer registration over time
  const customerGrowth = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        },
        newCustomers: { $sum: 1 },
        verifiedCustomers: {
          $sum: { $cond: ["$isPhoneVerified", 1, 0] },
        },
      },
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
    },
  ]);

  // Customer segments
  const customerSegments = await User.aggregate([
    {
      $lookup: {
        from: "orders",
        localField: "_id",
        foreignField: "user",
        as: "orders",
      },
    },
    {
      $addFields: {
        orderCount: { $size: "$orders" },
        totalSpent: {
          $sum: {
            $map: {
              input: "$orders",
              as: "order",
              in: "$$order.total",
            },
          },
        },
      },
    },
    {
      $group: {
        _id: {
          $switch: {
            branches: [
              { case: { $eq: ["$orderCount", 0] }, then: "new" },
              {
                case: {
                  $and: [
                    { $gte: ["$orderCount", 1] },
                    { $lt: ["$orderCount", 5] },
                  ],
                },
                then: "regular",
              },
              { case: { $gte: ["$orderCount", 5] }, then: "loyal" },
            ],
            default: "new",
          },
        },
        count: { $sum: 1 },
        avgSpent: { $avg: "$totalSpent" },
      },
    },
  ]);

  // Total stats
  const totalCustomers = await User.countDocuments();
  const verifiedCustomers = await User.countDocuments({
    isPhoneVerified: true,
  });
  const newCustomers = await User.countDocuments({
    createdAt: { $gte: startDate, $lte: endDate },
  });

  res.status(200).json({
    status: "success",
    data: {
      period,
      totalCustomers,
      verifiedCustomers,
      newCustomers,
      verificationRate:
        totalCustomers > 0 ? (verifiedCustomers / totalCustomers) * 100 : 0,
      customerGrowth,
      customerSegments,
    },
  });
});

// Size Analytics (Vendor Purchases & Customer Orders)
export const getSizeAnalytics = catchAsync(async (req, res, next) => {
  const sizes = ["S", "M", "L", "XL", "XXL", "XXXL", "Oversize"];

  // Vendor Purchases: Sum stockPurchased for each size from Product model
  // Assume each Product has a stockPurchased object: { S: 10, M: 5, ... }
  const products = await Product.find({ isActive: true });
  const vendorPurchases = {};
  sizes.forEach((size) => {
    vendorPurchases[size] = 0;
  });
  products.forEach((product) => {
    if (product.stockPurchased) {
      sizes.forEach((size) => {
        vendorPurchases[size] += product.stockPurchased[size] || 0;
      });
    }
  });

  // Customer Orders: Sum quantity for each size from Order items
  const orders = await Order.find({ status: { $ne: "cancelled" } });
  const customerOrders = {};
  sizes.forEach((size) => {
    customerOrders[size] = 0;
  });
  orders.forEach((order) => {
    if (order.items) {
      order.items.forEach((item) => {
        if (sizes.includes(item.size)) {
          customerOrders[item.size] += item.quantity || 0;
        }
      });
    }
  });

  res.status(200).json({
    status: "success",
    data: {
      sizes,
      vendorPurchases,
      customerOrders,
    },
  });
});

// Product Analytics
export const getProductAnalytics = catchAsync(async (req, res, next) => {
  const { period = "30d" } = req.query;

  let startDate;
  const endDate = new Date();

  switch (period) {
    case "7d":
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "1y":
      startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }

  // Top selling products
  const topProducts = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $ne: "cancelled" },
      },
    },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.product",
        name: { $first: "$items.name" },
        totalSold: { $sum: "$items.quantity" },
        revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
      },
    },
    { $sort: { totalSold: -1 } },
    { $limit: 10 },
  ]);

  // Category performance
  const categoryPerformance = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $ne: "cancelled" },
      },
    },
    { $unwind: "$items" },
    {
      $lookup: {
        from: "products",
        localField: "items.product",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $group: {
        _id: "$product.category",
        totalSold: { $sum: "$items.quantity" },
        revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
      },
    },
    { $sort: { revenue: -1 } },
  ]);

  // Product stats
  const totalProducts = await Product.countDocuments({ isActive: true });
  const lowStockProducts = await Product.countDocuments({
    $expr: { $lte: ["$stock", "$lowStockThreshold"] },
    isActive: true,
  });
  const outOfStockProducts = await Product.countDocuments({
    stock: 0,
    isActive: true,
  });

  res.status(200).json({
    status: "success",
    data: {
      period,
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      topProducts,
      categoryPerformance,
    },
  });
});

// Brand and Size Analytics for Admin Table
export const getBrandSizeAnalytics = catchAsync(async (req, res, next) => {
  try {
    // Get all products with their variants
    const products = await Product.find({ status: 'active' })
      .select('name brand variants stock price')
      .lean();

    // Get all orders with items
    const orders = await Order.find({ status: { $ne: 'cancelled' } })
      .select('items')
      .lean();

    // Process products to get vendor purchases (initial stock)
    const vendorData = {};
    products.forEach(product => {
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach(variant => {
          const key = `${product.brand || 'Unknown'}-${variant.size}`;
          if (!vendorData[key]) {
            vendorData[key] = {
              brand: product.brand || 'Unknown',
              size: variant.size,
              pricePerUnit: variant.price || product.price,
              boughtFromVendor: variant.stock || 0,
              soldToCustomer: 0,
              remainingStock: variant.stock || 0
            };
          } else {
            vendorData[key].boughtFromVendor += variant.stock || 0;
            vendorData[key].remainingStock += variant.stock || 0;
          }
        });
      } else {
        // For products without variants, use overall stock
        const key = `${product.brand || 'Unknown'}-ONE_SIZE`;
        if (!vendorData[key]) {
          vendorData[key] = {
            brand: product.brand || 'Unknown',
            size: 'ONE_SIZE',
            pricePerUnit: product.price,
            boughtFromVendor: product.stock || 0,
            soldToCustomer: 0,
            remainingStock: product.stock || 0
          };
        } else {
          vendorData[key].boughtFromVendor += product.stock || 0;
          vendorData[key].remainingStock += product.stock || 0;
        }
      }
    });

    // Process orders to get customer sales
    orders.forEach(order => {
      if (order.items) {
        order.items.forEach(item => {
          const key = `${item.brand || 'Unknown'}-${item.size || 'ONE_SIZE'}`;
          if (vendorData[key]) {
            vendorData[key].soldToCustomer += item.quantity || 0;
            vendorData[key].remainingStock -= item.quantity || 0;
          }
        });
      }
    });

    // Convert to array and sort by brand
    const analyticsData = Object.values(vendorData).sort((a, b) => 
      a.brand.localeCompare(b.brand) || a.size.localeCompare(b.size)
    );

    res.status(200).json({
      status: 'success',
      data: {
        analytics: analyticsData
      }
    });
  } catch (error) {
    console.error('Brand Size Analytics Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch brand size analytics'
    });
  }
});

// Dashboard Stats
export const getDashboardStats = catchAsync(async (req, res, next) => {
  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const startOfWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // Revenue stats
  const [todayRevenue, weekRevenue, monthRevenue, totalRevenue] =
    await Promise.all([
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfToday },
            status: { $ne: "cancelled" },
          },
        },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfWeek },
            status: { $ne: "cancelled" },
          },
        },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfMonth },
            status: { $ne: "cancelled" },
          },
        },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Order.aggregate([
        {
          $match: { status: { $ne: "cancelled" } },
        },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
    ]);

  // Order stats
  const [totalOrders, pendingOrders, completedOrders] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({ status: "pending" }),
    Order.countDocuments({ status: "completed" }),
  ]);

  // Customer stats
  const [totalCustomers, verifiedCustomers, newCustomersToday] =
    await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isPhoneVerified: true }),
      User.countDocuments({ createdAt: { $gte: startOfToday } }),
    ]);

  // Product stats
  const [totalProducts, lowStockProducts, outOfStockProducts] =
    await Promise.all([
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({
        $expr: { $lte: ["$stock", "$lowStockThreshold"] },
        isActive: true,
      }),
      Product.countDocuments({ stock: 0, isActive: true }),
    ]);

  res.status(200).json({
    status: "success",
    data: {
      revenue: {
        today: todayRevenue[0]?.total || 0,
        week: weekRevenue[0]?.total || 0,
        month: monthRevenue[0]?.total || 0,
        total: totalRevenue[0]?.total || 0,
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        completed: completedOrders,
      },
      customers: {
        total: totalCustomers,
        verified: verifiedCustomers,
        newToday: newCustomersToday,
      },
      products: {
        total: totalProducts,
        lowStock: lowStockProducts,
        outOfStock: outOfStockProducts,
      },
    },
  });
});