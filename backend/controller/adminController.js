const db = require("../library/database");
const multer = require("multer");
const path = require("path");

// Multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "image"); // Specify your upload directory
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Rename file to avoid conflicts
  },
});
const upload = multer({ storage: storage });

// Get all users (Admin only)
const getAllUsers = async (req, res) => {
  const sql = "SELECT id_user, username, role FROM tbl_users";
  try {
    const [rows] = await db.query(sql);
    res.json({
      payload: rows,
      message: "Success GET all users",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Internal Server Error",
      serverMessage: err,
    });
  }
};

// Delete a user (Admin only)
const deleteUser = async (req, res) => {
  const { id_user } = req.body;
  const sql = `DELETE FROM tbl_users WHERE id_user = ?`;
  try {
    const [result] = await db.query(sql, [id_user]);
    if (result.affectedRows) {
      res.json({
        payload: { isSuccess: result.affectedRows },
        message: "Success Delete User",
      });
    } else {
      res.status(404).json({
        message: "User Not Found",
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Internal Server Error",
      serverMessage: err,
    });
  }
};

// Update user role (Admin only)
const updateUserRole = async (req, res) => {
  const { id_user, role } = req.body;
  const sql = `UPDATE tbl_users SET role = ? WHERE id_user = ?`;
  try {
    const [result] = await db.query(sql, [role, id_user]);
    if (result.affectedRows) {
      res.json({
        payload: { isSuccess: result.affectedRows },
        message: "Success Update User Role",
      });
    } else {
      res.status(404).json({
        message: "User Not Found",
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Internal Server Error",
      serverMessage: err,
    });
  }
};

// Get all products
const getAllProducts = async (req, res) => {
  const sql =
    "SELECT id_product, product_name, description, price, stock, photos FROM tbl_products";
  try {
    const [rows] = await db.query(sql);
    res.json({
      payload: rows,
      message: "Success GET all products",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Internal Server Error",
      serverMessage: err,
    });
  }
};

const createProduct = async (req, res) => {
  try {
    const { product_name, description, price, stock, id_category } = req.body;
    let image = req.file; // Default to empty string

    if (req.file) {
      // Jika ada file yang diunggah
      image = `/image/${req.file.filename}`; // Store the relative path with extension
    } else {
      const ext = path.extname(req.file.originalname); // Ambil ekstensi file dari originalname
      // Jika tidak ada file yang diunggah
      image = `/image/default${ext}`; // Atau gunakan nilai default
    }

    console.log("Parsed request data:", {
      product_name,
      description,
      price,
      stock,
      id_category,
      image,
    });

    // Pastikan req.file tidak kosong
    if (!req.file) {
      throw new Error("No file uploaded");
    }

    const sql = `INSERT INTO tbl_products (product_name, description, price, stock, image, id_category) VALUES (?, ?, ?, ?, ?, ?)`;
    const values = [
      product_name,
      description,
      price,
      stock,
      image,
      id_category,
    ];

    const [result] = await db.query(sql, values);

    console.log("Database insert successful:", result);

    res.json({
      payload: {
        isSuccess: result.affectedRows > 0,
        id: result.insertId,
      },
      message: "Product added!",
    });
  } catch (err) {
    console.error("Error executing query:", err);
    res.status(500).json({
      message: "Internal Server Error",
      serverMessage: err.message,
    });
  }
};

// Update product
const updateProduct = async (req, res) => {
    // Fungsi upload single file menggunakan multer
    const uploadSingle = upload.single('image');
  
    // Lakukan upload file dan proses update product
    uploadSingle(req, res, async function (err) {
      if (err instanceof multer.MulterError) {
        // Handle error dari multer
        return res.status(500).json({ message: 'Multer error', serverMessage: err });
      } else if (err) {
        // Handle error lainnya
        return res.status(500).json({ message: 'File upload error', serverMessage: err });
      }
  
      const { id_product, product_name, description, price, stock, id_category } = req.body;
      let image = req.file ? `/uploads/${req.file.filename}` : undefined;
  
      try {
        // Dapatkan detail produk yang akan diperbarui dari database
        const [fetchResult] = await db.query(
          'SELECT * FROM tbl_products WHERE id_product = ?',
          [id_product]
        );
  
        if (!fetchResult.length) {
          return res.status(404).json({
            message: 'Product Not Found',
          });
        }
  
        // Ambil nilai yang ada jika tidak ada perubahan di request body
        const newName =
          product_name !== undefined ? product_name : fetchResult[0].product_name;
        const newDesc =
          description !== undefined ? description : fetchResult[0].description;
        const newPrice = price !== undefined ? price : fetchResult[0].price;
        const newStock = stock !== undefined ? stock : fetchResult[0].stock;
  
        // Jika tidak ada file yang diunggah, gunakan image yang ada di database
        if (!req.file) {
          image = fetchResult[0].image;
        } else {
          // Hapus gambar lama jika ada
          const oldImagePath = path.join(__dirname, '..', fetchResult[0].image);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
  
        // Query untuk melakukan update
        const updateSql = `UPDATE tbl_products SET product_name = ?, description = ?, price = ?, stock = ?, image = ?, id_category = ? WHERE id_product = ?`;
        const [result] = await db.query(updateSql, [
          newName,
          newDesc,
          newPrice,
          newStock,
          image,
          id_category,
          id_product,
        ]);
  
        if (result.affectedRows) {
          // Kirim respons JSON jika berhasil melakukan update
          res.json({
            payload: { isSuccess: result.affectedRows },
            message: 'Success Update Product',
          });
        } else {
          // Kirim respons JSON jika produk tidak ditemukan
          res.status(404).json({
            message: 'Product Not Found',
          });
        }
      } catch (err) {
        console.error(err);
        // Kirim respons JSON jika terjadi kesalahan server
        res.status(500).json({
          message: 'Internal Server Error',
          serverMessage: err,
        });
      }
    });
  };
  


// Get All category
const getAllCategories = async (req, res) => {
  const sql = "SELECT id_category, category_name FROM tbl_categorys";
  try {
    const [rows] = await db.query(sql);
    res.json({
      payload: rows,
      message: "Success GET all categories",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Internal Server Error",
      serverMessage: err,
    });
  }
};

// Create category
const createCategory = async (req, res) => {
  try {
    const { category_name, categorys } = req.body;
    let image = req.file; // Default to empty string

    if (req.file) {
      // Jika ada file yang diunggah
      image = `/image/${req.file.filename}`; // Store the relative path with extension
    } else {
      const ext = path.extname(req.file.originalname); // Ambil ekstensi file dari originalname
      // Jika tidak ada file yang diunggah
      image = `/image/default${ext}`; // Atau gunakan nilai default
    }

    console.log("Parsed request data:", {
      category_name,
      categorys,
      image,
    });

    // Pastikan req.file tidak kosong
    if (!req.file) {
      throw new Error("No file uploaded");
    }

    const sql = `INSERT INTO tbl_categorys (category_name, categorys, image) VALUES (?, ?, ?)`;
    const values = [category_name, categorys, image];

    const [result] = await db.query(sql, values);

    console.log("Database insert successful:", result);

    res.json({
      payload: {
        isSuccess: result.affectedRows > 0,
        id: result.insertId,
      },
      message: "Category added!",
    });
  } catch (err) {
    console.error("Error executing query:", err);
    res.status(500).json({
      message: "Internal Server Error",
      serverMessage: err.message,
    });
  }
};

// Update category
const updateCategory = async (req, res) => {
  upload.single("image")(req, res, async function (err) {
    if (err) {
      return res
        .status(500)
        .json({ message: "File upload error", serverMessage: err });
    }

    const { id_category, category_name, categorys } = req.body;
    const image = req.file ? req.file.filename : undefined;

    // Fetch existing category details first
    const fetchSql = `SELECT * FROM tbl_categorys WHERE id_category = ?`;
    try {
      const [fetchResult] = await db.query(fetchSql, [id_category]);
      if (!fetchResult.length) {
        return res.status(404).json({
          message: "Category Not Found",
        });
      }

      // Use existing value if category_name is not provided in request body
      const newName =
        category_name !== undefined
          ? category_name
          : fetchResult[0].category_name;
      const newCategorys =
        categorys !== undefined ? categorys : fetchResult[0].categorys;
      const newPhoto = image !== undefined ? image : fetchResult[0].image;

      const updateSql = `UPDATE tbl_categorys SET category_name = ?, categorys = ?, image = ? WHERE id_category = ?`;
      const [result] = await db.query(updateSql, [
        newName,
        newCategorys,
        newPhoto,
        id_category,
      ]);

      if (result.affectedRows) {
        res.json({
          payload: { isSuccess: result.affectedRows },
          message: "Success Update Category",
        });
      } else {
        res.status(404).json({
          message: "Category Not Found",
        });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: "Internal Server Error",
        serverMessage: err,
      });
    }
  });
};

// Delete product
const deleteProduct = async (req, res) => {
  const { id_product } = req.body;
  try {
    const sql = `DELETE FROM tbl_products WHERE id_product = ?`;
    const [result] = await db.query(sql, [id_product]);
    res.json({
      payload: {
        isSuccess: result.affectedRows,
        message: result.message,
      },
      message: "Success Delete Data",
    });
  } catch (err) {
    console.error("Error executing query:", err);
    res.status(500).json({
      message: "Internal Server Error",
      serverMessage: err,
    });
  }
};

// Delete category
const deleteCategory = async (req, res) => {
  const { id_category } = req.body;
  try {
    const sql = `DELETE FROM tbl_categorys WHERE id_category = ?`;
    const [result] = await db.query(sql, [id_category]);

    if (result.affectedRows) {
      res.json({
        payload: { isSuccess: result.affectedRows },
        message: "Success Delete Category",
      });
    } else {
      res.status(404).json({
        message: "Category Not Found",
      });
    }
  } catch (err) {
    console.error("Error executing query:", err);
    res.status(500).json({
      message: "Internal Server Error",
      serverMessage: err,
    });
  }
};

// Get transaction history (Admin only)
const getTransactionHistory = async (req, res) => {
  const sql = `SELECT th.*, op.id_product, p.product_name, p.price
                 FROM transaction_history th
                 JOIN order_product op ON th.id_order = op.id_order
                 JOIN tbl_products p ON op.id_product = p.id_product`;
  try {
    const [rows] = await db.query(sql);
    res.json({
      payload: rows,
      message: "Success GET transaction history",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Internal Server Error",
      serverMessage: err,
    });
  }
};

module.exports = {
  getAllUsers,
  deleteUser,
  updateUserRole,
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getTransactionHistory,
};
