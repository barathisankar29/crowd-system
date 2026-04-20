declare module "write-excel-file" {
  const writeXlsxFile: (data: any[], options?: any) => Promise<void>;
  export default writeXlsxFile;
}