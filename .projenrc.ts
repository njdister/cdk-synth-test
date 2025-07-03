import { awscdk, javascript } from 'projen';

const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.203.1',
  defaultReleaseBranch: 'main',
  name: '_cdk_synth_test',
  packageManager: javascript.NodePackageManager.PNPM,
  projenrcTs: true,

  // deps: [],                /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
});

project.cdkConfig.json.addOverride('context', {
  '@aws-cdk/core:bootstrapQualifier': 'infrav200',
});

project.synth();