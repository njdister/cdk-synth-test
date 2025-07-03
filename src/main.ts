import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

class TestStack1 extends cdk.Stack {
  public s3Bucket: s3.Bucket;

  constructor(scope: Construct, id: string, stackProps?: cdk.StackProps) {
    super(scope, id, stackProps);

    this.s3Bucket = new s3.Bucket(this, 'TestStackBucket', {
      bucketName: 'lldc-test-stack-bucket',
    });
  }
}

class TestStack2 extends cdk.Stack {
  public iamRole: iam.Role;

  constructor(scope: Construct, id: string, s3BucketArn: string, stackProps?: cdk.StackProps) {
    super(scope, id, stackProps);

    this.iamRole = new iam.Role(this, 'TestStackRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
    });

    this.iamRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        's3:Describe*',
        's3:Get*',
        's3:List*',
        's3:PutObject',
      ],
      resources: [
        s3BucketArn,
      ],
    }));
  }
}

class TestStage extends cdk.Stage {
  constructor(scope: Construct, id: string, synthesizer?: cdk.DefaultStackSynthesizer, stageProps?: cdk.StageProps) {
    super(scope, id, stageProps);

    const testStack1 = new TestStack1(this, 'TestStack1', { synthesizer: synthesizer });

    new TestStack2(this, 'TestStack2', testStack1.s3Bucket.bucketArn, { synthesizer: synthesizer });
  }
}

interface TestPipelineStackProps {
  readonly synthesizer: cdk.DefaultStackSynthesizer;
  readonly app: cdk.App;
}

class TestPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, pipelineProps?: TestPipelineStackProps, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create pipeline
    const pipeline = new cdk.pipelines.CodePipeline(this, 'TestPipeline', {
      crossAccountKeys: true,
      pipelineName: this.node.id,
      selfMutation: true,
      synth: new cdk.pipelines.ShellStep('Synth', {
        input: cdk.pipelines.CodePipelineSource.gitHub(
          'njdister/cdk-synth-test',
          'main',
          {
            authentication: cdk.SecretValue.secretsManager('arn:aws:secretsmanager:us-east-1:450848035474:secret:/infrav200/github-token-SP0rWy'),
            trigger: cdk.aws_codepipeline_actions.GitHubTrigger.WEBHOOK,
          },
        ),
        installCommands: [
          'n 22.13.1',
          'corepack enable',
          'corepack install -g pnpm@9.0.6',
          'pnpm install --frozen-lockfile',
        ],
        commands: [
          'pnpm exec projen synth:silent',
        ],
      }),
      useChangeSets: false,
    });

    pipeline.addStage(
      new TestStage(app, 'TestStage-USE1', pipelineProps!.synthesizer, {
        env: { account: '450848035474', region: 'us-east-1' },
      }),
    );

    pipeline.addStage(
      new TestStage(app, 'TestStage-USW2', pipelineProps!.synthesizer, {
        env: { account: '450848035474', region: 'us-west-2' },
      }),
    );
  }
}

const app = new cdk.App();
const synthesizer = new cdk.DefaultStackSynthesizer({ qualifier: 'infrav200' });

new TestPipelineStack(app, 'TestPipelineStack',
  {
    synthesizer: synthesizer,
    app: app,
  },
  {
    env: { account: '450848035474', region: 'us-east-1' },
  },
);

app.synth();