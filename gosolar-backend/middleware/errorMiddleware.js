const errorMiddleware = (err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);

  if(err.code === '23505'){
    return res.status(409).json({message: 'Record already exists'});
  }

  if(err.code === '23503'){
    return res.status(400).json({message: 'Invalid database reference'});
  }

  if(err.name === 'JsonWebTokenError'){
    return res.status(401).json({message: 'Invalid token'});
  }

  if(err.name === 'TokenExpiredError'){
    return res.status(401).json({message: 'Token expired'});
  }

  const status = err.status || 500;
  res.status(status).json({message: err.message || 'Server error'});
};

module.exports = errorMiddleware;