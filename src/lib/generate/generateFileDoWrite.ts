import NamingUtils from '@/lib/helpers/NamingUtils';
import fs from 'fs-extra';

export default (isFirstRun: boolean, templatePath: string, rootTplFilePath: string, nodegenDir: string) => {
  if (isFirstRun) {
    return true;
  }

  if (!fs.existsSync(NamingUtils.stripNjkExtension(templatePath))) {
    return true;
  }
  const rootTplFilePathCleaned = rootTplFilePath.replace('.openapi-nodegen', '');
  return !!rootTplFilePathCleaned.includes(nodegenDir);
};
