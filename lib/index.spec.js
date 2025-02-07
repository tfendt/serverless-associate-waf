const AssociateWafPlugin = require('.')
const Serverless = require('serverless/lib/Serverless')
const AwsProvider = jest.genMockFromModule('serverless/lib/plugins/aws/provider/awsProvider')
const CLI = jest.genMockFromModule('serverless/lib/classes/CLI')

const AWSErrorMessage = 'Some AWS provider error'

describe('AssociateWafPlugin', () => {
  let plugin
  let serverless
  let options

  beforeEach(() => {
    serverless = new Serverless()
    serverless.service.service = 'my-service'
    serverless.service.serviceObject = {
      name: 'my-service'
    }
    options = {}
    serverless.setProvider('aws', new AwsProvider(serverless))
    serverless.cli = new CLI(serverless)
  })

  describe('constructor', () => {
    beforeEach(() => {
      plugin = new AssociateWafPlugin(serverless, options)
    })

    it('should set the provider to instance of AwsProvider', () => {
      expect(plugin.provider).toBeInstanceOf(AwsProvider)
    })

    it('should have access to the serverless instance', () => {
      expect(plugin.serverless).toEqual(serverless)
    })
  })

  describe('without configuration', () => {

    describe('with missing object "custom"', () => {
      beforeEach(() => {
        serverless.service.custom = undefined
        plugin = new AssociateWafPlugin(serverless, options)
      })

      it('should default to empty config', () => {
        expect(plugin.config).toEqual({})
      })

      it('should set hooks', () => {
        expect(plugin.hooks).toHaveProperty('after:deploy:deploy')
        expect(plugin.hooks).toHaveProperty('before:package:finalize')
      })

      it('"outputRestApiId()" should be invoked', async () => {
        await expectOutputRestApiIdToHaveBeenCalled(plugin)
      })

      it('"disassociateWaf()" should be invoked', async () => {
        await expectDisassociateWafToHaveBeenCalled(plugin)
      })

    })

    describe('with missing object "custom.associateWaf"', () => {
      beforeEach(() => {
        serverless.service.custom = {}
        plugin = new AssociateWafPlugin(serverless, options)
      })

      it('should default to empty config', () => {
        expect(plugin.config).toEqual({})
      })

      it('should set hooks', () => {
        expect(plugin.hooks).toHaveProperty('after:deploy:deploy')
        expect(plugin.hooks).toHaveProperty('before:package:finalize')
      })

      it('"outputRestApiId()" should be invoked', async () => {
        await expectOutputRestApiIdToHaveBeenCalled(plugin)
      })

      it('"disassociateWaf()" should be invoked', async () => {
        await expectDisassociateWafToHaveBeenCalled(plugin)
      })

    })

    describe('with null object "custom.associateWaf"', () => {
      beforeEach(() => {
        serverless.service.custom = {
          associateWaf: null
        }
        plugin = new AssociateWafPlugin(serverless, options)
      })

      it('should default to empty config', () => {
        expect(plugin.config).toEqual({})
      })

      it('should set hooks', () => {
        expect(plugin.hooks).toHaveProperty('after:deploy:deploy')
        expect(plugin.hooks).toHaveProperty('before:package:finalize')
      })

      it('"outputRestApiId()" should be invoked', async () => {
        await expectOutputRestApiIdToHaveBeenCalled(plugin)
      })

      it('"disassociateWaf()" should be invoked', async () => {
        await expectDisassociateWafToHaveBeenCalled(plugin)
      })

    })

    describe('with missing property "custom.associateWaf.name"', () => {
      beforeEach(() => {
        serverless.service.custom = {
          associateWaf: {}
        }
        plugin = new AssociateWafPlugin(serverless, options)
      })

      it('should set hooks if ', () => {
        expect(plugin.hooks).toHaveProperty('after:deploy:deploy')
        expect(plugin.hooks).toHaveProperty('before:package:finalize')
      })

      it('"outputRestApiId()" should be invoked', async () => {
        await expectOutputRestApiIdToHaveBeenCalled(plugin)
      })

      it('"disassociateWaf()" should be invoked', async () => {
        await expectDisassociateWafToHaveBeenCalled(plugin)
      })
    })

    describe('with empty property "custom.associateWaf.name"', () => {
      beforeEach(() => {
        serverless.service.custom = {
          associateWaf: {
            name: ''
          }
        }
        serverless.service.provider.compiledCloudFormationTemplate = {
          Outputs: [
            {}]
        }
        plugin = new AssociateWafPlugin(serverless, options)
      })

      it('should set hooks if ', () => {
        expect(plugin.hooks).toHaveProperty('after:deploy:deploy')
        expect(plugin.hooks).toHaveProperty('before:package:finalize')
      })

      it('"outputRestApiId()" should be invoked', async () => {
        await expectOutputRestApiIdToHaveBeenCalled(plugin)
      })

      it('"disassociateWaf()" should be invoked', async () => {
        await expectDisassociateWafToHaveBeenCalled(plugin)
      })
    })
  })

  describe('with configuration', () => {
    beforeEach(() => {
      serverless.service.custom = {
        associateWaf: {
          name: 'stage-service-name'
        }
      }
      serverless.service.provider.compiledCloudFormationTemplate = {
        Outputs: [
          'ApiGatewayRestApiWaf', {Description: 'Rest API Id', Value: 'some-api-rest-id'}]
      }
      plugin = new AssociateWafPlugin(serverless, options)
    })

    it('should set config', () => {
      expect(plugin.config).toBeTruthy()
    })

    it('should set hooks', () => {
      expect(plugin.hooks).toHaveProperty('after:deploy:deploy')
      expect(plugin.hooks).toHaveProperty('before:package:finalize')
    })

    it('"outputRestApiId()" should be invoked', async () => {
      await expectOutputRestApiIdToHaveBeenCalled(plugin)
    })

    it('should output restApiId', () => {
      plugin.updateCloudFormationTemplate()
      expect(serverless.service.provider.compiledCloudFormationTemplate.Outputs['ApiGatewayRestApiWaf']).toBeDefined()
    })

    it('"associateWaf()" should be invoked', async () => {
      plugin.associateWaf = jest.fn()
      plugin.associateWaf.mockResolvedValueOnce({})
      await plugin.updateWafAssociation()
      expect(plugin.associateWaf).toHaveBeenCalled()
    })

  })

  const mockStackResources = {
    StackResourceSummaries: [
      {
        LogicalResourceId: 'some',
        PhysicalResourceId: 'thing'
      },
      {
        LogicalResourceId: 'ApiGatewayRestApi',
        PhysicalResourceId: 'theRestApiId'
      }
    ]
  }

  const mockStackOutputs = {
    Stacks: [
      {
        Outputs: [
          {
            OutputKey: 'some',
            OutputValue: 'value'
          },
          {
            OutputKey: 'ApiGatewayRestApiWaf',
            OutputValue: 'theRestApiId'
          }
        ]
      }
    ]
  }

  const mockStackMissingOutputs = {
    Stacks: [
      {
        NotOutputs: [{}]
      }
    ]
  }

  describe('associateWaf()', () => {

    beforeEach(() => {
      serverless.service.custom = {
        associateWaf: {
          name: 'some-waf-name'
        }
      }
      plugin = new AssociateWafPlugin(serverless, options)
    })

    it('should not lookup REST API ID from CloudFormation stack if specified by provider configuration', async () => {
      plugin.serverless.service.provider.apiGateway = {
        restApiId: 'something'
      }
      plugin.provider.request.mockResolvedValueOnce({})

      await plugin.associateWaf()

      expect(plugin.provider.request).not.toHaveBeenCalledWith('CloudFormation', expect.anything(), expect.anything())
    })

    it('should log info when unable to find REST API ID from CloudFormation stack', async () => {
      plugin.provider.request.mockResolvedValue({})

      await plugin.associateWaf()

      expect(plugin.serverless.cli.log).toHaveBeenLastCalledWith(expect.stringContaining('Unable to determine REST API ID'))
    })

    it('should log info when unable to fund REST API ID from stack outputs', async () => {
      plugin.provider.request.mockResolvedValueOnce({})
      plugin.provider.request.mockResolvedValueOnce(mockStackMissingOutputs)

      await plugin.associateWaf()

      expect(plugin.serverless.cli.log).toHaveBeenLastCalledWith(expect.stringContaining('Unable to determine REST API ID'))
    })
  })

    it('should log info when unable to find WAF', async () => {
      plugin.provider.request
        .mockResolvedValueOnce(mockStackResources)
        .mockResolvedValueOnce(mockStackOutputs)
        .mockResolvedValueOnce({})

      await plugin.associateWaf()

      expect(plugin.serverless.cli.log).toHaveBeenLastCalledWith(expect.stringContaining('Unable to find WAF named'))
    })

    it('should log error when exception caught', async () => {
      spy = await setupAwsErrorMessage(plugin)
      await plugin.associateWaf()
      expect(spy).toHaveBeenLastCalledWith(expect.stringContaining(AWSErrorMessage))
    })

    it('should associate WAF', async () => {
      const mockWebAcls = {
        WebACLs: [
          {
            Name: 'skip-waf-name',
            WebACLId: 'skip-waf-id'
          },
          {
            Name: 'some-waf-name',
            WebACLId: 'some-waf-id'
          }
        ]
      }

      plugin.provider.request
        .mockResolvedValueOnce(mockStackResources)
        .mockResolvedValueOnce(mockWebAcls)

      await plugin.associateWaf()

      expect(plugin.serverless.cli.log).toHaveBeenLastCalledWith(expect.stringContaining('Associating WAF...'))
    })

    it('should associate WAF with split stacks plugin', async () => {
      const mockWebAcls = {
        WebACLs: [
          {
            Name: 'skip-waf-name',
            WebACLId: 'skip-waf-id'
          },
          {
            Name: 'some-waf-name',
            WebACLId: 'some-waf-id'
          }
        ]
      }

      plugin.provider.request
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce(mockStackOutputs)
        .mockResolvedValueOnce(mockWebAcls)

      await plugin.associateWaf()

      expect(plugin.serverless.cli.log).toHaveBeenLastCalledWith(expect.stringContaining('Associating WAF...'))
    })

  describe('disassociateWaf()', () => {
    beforeEach(() => {
      serverless.service.custom = {}
      plugin = new AssociateWafPlugin(serverless, options)
    })

    it('should log info when unable to find REST API ID from CloudFormation stack', async () => {
      plugin.provider.request.mockResolvedValue({})

      await plugin.disassociateWaf()

      expect(plugin.serverless.cli.log).toHaveBeenLastCalledWith(expect.stringContaining('Unable to determine REST API ID'))
    })

    it('should log error when exception caught', async () => {
      spy = await setupAwsErrorMessage(plugin)
      await plugin.disassociateWaf()
      expect(spy).toHaveBeenLastCalledWith(expect.stringContaining(AWSErrorMessage))
    })

    it('should disassociate WAF if associated', async () => {
      const mockWebAcls = {
        WebACLSummary: {
          WebACLId: 'some-waf-id',
          Name: 'some-waf-name'
        }
      }

      plugin.provider.request
        .mockResolvedValueOnce(mockStackResources)
        .mockResolvedValueOnce(mockWebAcls)
        .mockResolvedValueOnce({})

      await plugin.disassociateWaf()

      expect(plugin.serverless.cli.log).toHaveBeenLastCalledWith(expect.stringContaining('Disassociating WAF...'))
    })

    it('should not disassociate WAF if associated', async () => {
      const mockWebAcls = { }

      plugin.provider.request
        .mockResolvedValueOnce(mockStackResources)
        .mockResolvedValueOnce(mockStackOutputs)
        .mockResolvedValueOnce(mockWebAcls)
        .mockResolvedValueOnce({})

      await plugin.disassociateWaf()

      expect(plugin.serverless.cli.log).not.toHaveBeenLastCalledWith(expect.stringContaining('Disassociating WAF...'))
    })

  })

  async function setupAwsErrorMessage(plugin){
    const spy = jest.spyOn(console, 'error')
    plugin.provider.request
      .mockRejectedValueOnce(new Error(AWSErrorMessage))
    return spy
  }

  async function expectDisassociateWafToHaveBeenCalled(plugin){
    plugin.disassociateWaf = jest.fn()
    plugin.disassociateWaf.mockResolvedValueOnce({})
    await plugin.updateWafAssociation()
    expect(plugin.disassociateWaf).toHaveBeenCalled()
  }

  async function expectOutputRestApiIdToHaveBeenCalled(plugin){
    plugin.outputRestApiId = jest.fn()
    plugin.outputRestApiId.mockResolvedValueOnce({})
    await plugin.updateCloudFormationTemplate()
    expect(plugin.outputRestApiId).toHaveBeenCalled()
  }

})
