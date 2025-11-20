export const filterAllowedFields = <T extends Record<string, unknown>>(
  obj: T,
  ...allowedFields: string[]
) => {
  const newObj: Partial<T> = {};
  Object.keys(obj).forEach((key) => {
    if (allowedFields.includes(key)) {
      newObj[key as keyof T] = obj[key as keyof T];
    }
  });
  return newObj;
};
