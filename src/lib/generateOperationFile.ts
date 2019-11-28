import fs from 'fs-extra';
import _ from 'lodash';
import path from 'path';
import prettier from 'prettier';

import GenerateOperationFileConfig from '@/interfaces/GenerateOperationFileConfig';
import FileTypeCheck from '@/lib/FileTypeCheck';
import GeneratedComparison from '@/lib/GeneratedComparison';
import NamingUtils from '@/lib/helpers/NamingUtils';
import TemplateRenderer from '@/lib/TemplateRenderer';

/**
 * Generates a file for every operation.
 *
 * @param config
 * @param operation
 * @param operationName
 * @param verbose
 * @param additionalTplContent
 * @returns {Promise}
 */
export default (config: GenerateOperationFileConfig, operation: any, operationName: string, verbose = false, additionalTplContent: any = {}) => {
  return new Promise((resolve, reject) => {
    const filePath = path.join(config.root, config.file_name);
    fs.readFile(filePath, 'utf8', (err: any, data: any) => {
      if (err) {
        return reject(err);
      }
      const subDir = config.root.replace(new RegExp(`${config.templates_dir}[/]?`), '');
      const ext = NamingUtils.getFileExt(config.file_name);
      const newFilename = NamingUtils.fixRouteName(NamingUtils.generateOperationSuffix(subDir, operationName, ext));
      const targetFile = path.resolve(config.targetDir, subDir, newFilename);
      const tplVars = {
        operation_name: _.camelCase(operationName.replace(/[}{]/g, '')),
        operations: operation,
        swagger: config.data.swagger,
        mockServer: config.mockServer || false,
        verbose,
        ...additionalTplContent,
      };
      const renderedContent = TemplateRenderer.load(data.toString(), tplVars);

      const replacedCharacters = renderedContent.replace(new RegExp('&' + '#' + 'x27;', 'g'), '\'');
      const prettyContent = prettier.format(replacedCharacters, {
        bracketSpacing: true,
        endOfLine: 'auto',
        semi: true,
        singleQuote: true,
        parser: ext === 'ts' ? 'typescript' : 'babel',
      });

      const moduleType = subDir.substring(subDir.lastIndexOf('/') + 1);
      if (config.data.ignoredModules && config.data.ignoredModules.includes(moduleType)) {
        return reject('Module ignored: ' + moduleType);
      }
      if (FileTypeCheck.isStubFile(config.file_name) && fs.existsSync(targetFile)) {
        GeneratedComparison.generateComparisonFile(
          targetFile,
          config.targetDir,
          subDir,
          newFilename,
          prettyContent,
        )
          .then(resolve)
          .catch(reject);
      } else {
        fs.writeFileSync(targetFile, prettyContent, 'utf8');
        return resolve();
      }
    });
  });
};