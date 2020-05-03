import 'colors';
import * as fs from 'fs-extra';
import path from 'path';
import globalHelpers from '@/utils/globalHelpers';
import Config from '@/interfaces/Config';
import ConfigMerger from '@/lib/ConfigMerger';
import FileIterator from '@/lib/FileIterator';
import GeneratedComparison from '@/lib/generate/GeneratedComparison';
import generateDirectoryStructure from '@/lib/generate/generateDirectoryStructure';
import TemplateFetch from '@/lib/template/TemplateFetch';
import OpenAPIBundler from '@/lib/openapi/OpenAPIBundler';
import logTimeDiff from '@/utils/logTimeDiff';

/**
 * Generates a code skeleton for an API given an OpenAPI/Swagger file.
 * @return {Promise}
 */
export default async (config: Config): Promise<boolean> => {
  logTimeDiff(0, 0);
  const startTime = new Date().getTime();
  globalHelpers(config.verbose, config.veryVerbose);

  console.log('Fetching templates...'.green.bold);
    const templatesDir = await TemplateFetch.resolveTemplateType(config.template, config.targetDir, config.dontUpdateTplCache);
    let extendedConfig = await ConfigMerger.base(config, templatesDir);
  logTimeDiff(startTime, (new Date()).getTime(), true);

  console.log('Preparing openapi object...'.green.bold);
    const apiObject = await OpenAPIBundler.bundle(config.swaggerFilePath, extendedConfig);
  logTimeDiff(startTime, (new Date()).getTime(), true);

  console.log(`Printing full object to the .openapi-nodegen directory`.green.bold);
    const baseCompiledObjectPath = path.join(GeneratedComparison.getCacheBaseDir(config.targetDir), 'apiObject.json');
    fs.ensureFileSync(baseCompiledObjectPath);
    fs.writeJsonSync(baseCompiledObjectPath, apiObject, {spaces: 2});
    extendedConfig = ConfigMerger.injectSwagger(extendedConfig, apiObject);
  logTimeDiff(startTime, (new Date()).getTime(), true);

  console.log('Injecting content to files...'.green.bold);
    await FileIterator.walk(generateDirectoryStructure(extendedConfig, templatesDir), extendedConfig);
  logTimeDiff(startTime, (new Date()).getTime(), true);

  if (!config.dontRunComparisonTool) {
    console.log('Building stub file comparison list...'.green.bold);
      const diffObject = await GeneratedComparison.fileDiffs(config.targetDir);
      await GeneratedComparison.fileDiffsPrint(config.targetDir, diffObject);
    logTimeDiff(startTime, (new Date()).getTime(), true);

    console.log('Comparison version cleanup...'.green.bold);
      GeneratedComparison.versionCleanup(config.targetDir);
    logTimeDiff(startTime, (new Date()).getTime(), true);
  }

  console.log('Complete'.green.bold);
  return true;
};
