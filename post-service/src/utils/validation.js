import Joi from 'joi';

export const validateCreatePost = (data) => {
    const schema = Joi.object({
      content: Joi.string().min(3).max(5000).required(),
      
    });
  
    return schema.validate(data);
  };
  // export const validateLogin = (data) => {
  //   const schema = Joi.object({

  //     email: Joi.string().email().required(),
  //     password: Joi.string().min(6).required(),
  //   });
  
  //   return schema.validate(data);
  // };

