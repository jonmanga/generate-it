import GenerateOperationFileConfig from '@/interfaces/GenerateOperationFileConfig';
import _, { each } from 'lodash';
import generateSubresourceName from '@/lib/generate/generateSubresourceName';
import path from 'path';
import fs from 'fs-extra';
import NamingUtils from '@/lib/helpers/NamingUtils';
import TemplateRenderer from '@/lib/template/TemplateRenderer';
import FileTypeCheck from '@/lib/FileTypeCheck';
import GeneratedComparison from '@/lib/generate/GeneratedComparison';
import { TemplateVariables } from '@/interfaces/TemplateVariables';
import { OperationsContainer, Operations } from '@/interfaces/Operations';
import includeChannelAction from '@/utils/includeChannelAction';

class GenerateOperation {
  /**
   * Groups all http verbs for each path to then generate each operation file
   */
  public async files (config: GenerateOperationFileConfig, fileType: string) {
    // Iterate over all paths
    // pathProperties = all the http verbs and their contents
    // pathName = the full path after the basepath
    if (config.data.swagger.paths) {
      return this.openapiFiles(config, fileType);
    } else if (config.data.swagger.channels) {
      return this.asyncApiFiles(config, fileType);
    }
  }

  public async openapiFiles (config: GenerateOperationFileConfig, fileType: string) {
    const files: OperationsContainer = {};
    each(config.data.swagger.paths, (pathProperties, pathName) => {
      const operationName = pathProperties.endpointName;
      files[operationName] = files[operationName] || [];
      pathName = pathName.replace(/}/g, '').replace(/{/g, ':');
      files[operationName].push({
        path_name: pathName,
        path: pathProperties,
        subresource: generateSubresourceName(pathName, operationName),
      });
    });

    for (const operationNameItem in files) {
      const operation = files[operationNameItem];
      await this.file(config, operation, operationNameItem, fileType);
    }
    return files;
  }

  public async asyncApiFiles (config: GenerateOperationFileConfig, fileType: string) {
    const files: OperationsContainer = {};
    for (const channelName in config.data.swagger.channels) {
      const channel = config.data.swagger.channels[channelName];
      ['publish', 'subscribe'].forEach((action: string) => {
        if (includeChannelAction(config.data.nodegenRc, action, channel)) {
          files[channel[action].operationId] = [{
            channelSubscribe: channel[action],
            channelDescription: channel.description || '',
            channelName
          }];
        }
      });
    }
    for (const operationNameItem in files) {
      const operation = files[operationNameItem];
      await this.file(config, operation, operationNameItem, fileType);
    }
    return files;
  }

  /**
   * Generate an operation file
   */
  public async file (
    config: GenerateOperationFileConfig,
    operations: Operations,
    operationName: string,
    fileType: string,
    verbose = false,
    additionalTplContent: any = {},
  ) {
    const filePath = path.join(config.root, config.file_name);
    const data = fs.readFileSync(filePath, 'utf8');
    const subDir = config.root.replace(new RegExp(`${config.templates_dir}[/]?`), '');
    const ext = NamingUtils.getFileExt(config.file_name);
    const newFilename = NamingUtils.fixRouteName(NamingUtils.generateOperationSuffix(subDir, operationName, ext));
    const targetFile = path.resolve(config.targetDir, subDir, newFilename);
    fs.ensureDirSync(path.resolve(config.targetDir, subDir));
    const tplVars = this.templateVariables(operationName, operations, config, additionalTplContent, verbose, fileType);
    const renderedContent = TemplateRenderer.load(
      data.toString(),
      tplVars,
      ext,
    );

    if (FileTypeCheck.isStubFile(config.file_name) && fs.existsSync(targetFile)) {
      return await GeneratedComparison.generateComparisonFile(
        targetFile,
        config.targetDir,
        subDir,
        newFilename,
        renderedContent,
      );
    }
    return fs.writeFileSync(targetFile, renderedContent, 'utf8');
  }

  /**
   * Returns the template variables
   */
  public templateVariables (
    operationName: string,
    operations: Operations,
    config: GenerateOperationFileConfig,
    additionalTplContent: any = {},
    verbose: boolean = false,
    fileType: string,
  ): TemplateVariables {
    return {
      operation_name: _.camelCase(operationName.replace(/[}{]/g, '')),
      fileType,
      config,
      operations,
      swagger: config.data.swagger,
      mockServer: config.mockServer || false,
      nodegenRc: config.data.nodegenRc,
      verbose,
      ...additionalTplContent,
    };
  }
}

export default new GenerateOperation();