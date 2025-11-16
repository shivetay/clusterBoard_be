export const filterAllowedFields = (
  obj: Record<string, any>,
  ...allowedFields: string[]
) => {
  const newObj: Record<string, any> = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};
