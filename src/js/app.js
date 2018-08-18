/* global $, web3, Web3, UI, TruffleContract */

/* metamask only supports these methods syncronously
 * eth_accounts (web3.eth.accounts)
 * eth_coinbase (web3.eth.coinbase)
 * eth_uninstallFilter (web3.eth.uninstallFilter)
 * web3.eth.reset (uninstalls all filters).
 * net_version (web3.version.network).
 */

const App = {

  web3Provider: null,
  contracts: {},
  rpcurl: 'http://127.0.0.1:7545',
  network: null,
  account: null,

  init: function () {
    console.log('App.init')
    UI.setup()
    return App.initWeb3()
  },

  initWeb3: function () {
    // define App.web3Provider
    if (typeof web3 !== 'undefined') {
      if (web3.currentProvider.isMetaMask) {
        console.log('Metamask detected')
        App.web3Provider = web3.currentProvider
      } else {
        console.log('Metamask not detected, found other web3')
      }
    } else {
      // TODO: In production, warn that Metamask is not enabled and disable
      // If no injected web3 instance is detected, fall back to create web3
      // TODO: verify correct server for testing
      console.log('create new web3')
      // use 127.0.0.1 is better than localhost (no network access required)
      // https://truffleframework.com/docs/advanced/truffle-with-metamask#using-metamask-with-truffle-develop
      App.web3Provider = new Web3.providers.HttpProvider(App.rpcurl)
    }
    // global assignment on purpose
    // define global web3 with provider
    // overwrite web3 with ethereumProvider created with Web3 constructor
    web3 = new Web3(App.web3Provider) // eslint-disable-line no-global-assign
    console.log('web3 version: ', web3.version.api)
    App.logNetwork()
    App.updateAccount()
    App.initContract('StakePool')
  },

  initContract: function (name) {
    $.getJSON(`./js/${name}.json`, function (data) {
      console.log('Contract Data: ', data)
      // instantiate new contract
      // TODO: update network programattically
      App.contracts[name] = TruffleContract(data)
      App.contracts[name].setProvider(App.web3Provider)
    })
      .then(function (data) {
        console.log(`getJSON.then:${name}`)
        console.log(`${name}:\n`, App.contracts[name])
        UI.enableElemById('#b_trx')
        App.getBalance()
        App.getStakedBalance()
        App.getStakeRequestBalance()
        App.getUnStakeRequestBalance()
      })
      .fail(function (jqxhr, textStatus, error) {
        let err = textStatus + ', ' + error
        console.log('jQuery jqxhr: ', jqxhr)
        console.log('Failed to find Smart Contract:\n' + err)
        UI.disableElemById('#b_trx')
        return error
      })
  },

  updateAccount: function () {
    App.account = web3.eth.accounts[0]
    console.log(App.account)
    $('#t_account').text(App.account)
    return App.account
  },

  depositFunds: function (value) {
    // TODO: value must be <= 18 decimal places -- otherwise fails
    App.contracts.StakePool.deployed().then(function (instance) {
      // transaction functions are objects of contract instance
      return instance.deposit(
        {
          from: App.account,
          value: web3.toWei(value, 'ether')
        }
      )
    }).then(function (result) {
      console.log('transaction submitted by user')
      console.log(result)
      let b = web3.fromWei(result.logs[0].args.balance.toNumber(), 'ether')
      $('#s_value').text(b)
    }).catch(function (err) {
      console.log('transaction rejected by user')
      console.log(err.message)
    })
  },

  getBalance: function () {
    App.contracts.StakePool.deployed().then(function (instance) {
      // TODO: this method below will allow consolidating all get balance functions
      return instance['getBalance'].call()
    }).then(function (value) {
      console.log('Value: ', value)
      let v = web3.fromWei(value.toNumber(), 'ether')
      console.log('Update Balance: ', v)
      // value is in wei, display in ether
      // TODO: update UI with balance
      $('#s_value').text(v)
    }).catch(function (err) {
      console.error('Contract not found. Ensure contract is deployed')
      console.error(`Balance request failed: ${err.message}`)
      $('#s_value').text('0')
    })
  },

  getStakedBalance: function () {
    App.contracts.StakePool.deployed().then(function (instance) {
      return instance.getStakedBalance.call()
    }).then(function (value) {
      console.log('Value: ', value)
      let v = web3.fromWei(value.toNumber(), 'ether')
      console.log('Update Balance: ', v)
      // value is in wei, display in ether
      // TODO: update UI with balance
      $('#s_staked').text(v)
    }).catch(function (err) {
      console.error('Contract not found. Ensure contract is deployed')
      console.error(`Balance request failed: ${err.message}`)
      $('#s_staked').text('0')
    })
  },

  getStakeRequestBalance: function () {
    App.contracts.StakePool.deployed().then(function (instance) {
      return instance.getStakeRequestBalance.call()
    }).then(function (value) {
      console.log('Value: ', value)
      let v = web3.fromWei(value.toNumber(), 'ether')
      console.log('Update Balance: ', v)
      // value is in wei, display in ether
      // TODO: update UI with balance
      $('#s_req_stake').text(v)
    }).catch(function (err) {
      console.error('Contract not found. Ensure contract is deployed')
      console.error(`Balance request failed: ${err.message}`)
      $('#s_req_stake').text('0')
    })
  },

  getUnStakeRequestBalance: function () {
    App.contracts.StakePool.deployed().then(function (instance) {
      return instance.getUnStakeRequestBalance.call()
    }).then(function (value) {
      console.log('Value: ', value)
      let v = web3.fromWei(value.toNumber(), 'ether')
      console.log('Update Balance: ', v)
      // value is in wei, display in ether
      // TODO: update UI with balance
      $('#s_req_unstake').text(v)
    }).catch(function (err) {
      console.error('Contract not found. Ensure contract is deployed')
      console.error(`Balance request failed: ${err.message}`)
      $('#s_req_unstake').text('0')
    })
  },

  withdrawFunds: function (value) {
    web3.eth.getGasPrice((err, price) => {
      if (err) console.error(err)
      console.log(`gas price:${price.toString(10)}`)
    })
    // TODO: how can I add a verification message to Metamask?
    App.contracts.StakePool.deployed().then(async function (instance) {
      let result = {}
      await instance.withdraw.estimateGas(
        web3.toWei(value, 'ether'),
        { from: App.account }
      ).then(function (resolve, reject) {
        result.estimate = resolve
      })
      result.instance = instance
      return result
    }).then(function (obj) {
      console.log(`gas estimate: ${obj.estimate}`)
      return obj
    }).then(function (obj) {
      return obj.instance.withdraw(
        web3.toWei(value, 'ether'),
        {
          from: App.account,
          gas: obj.estimate + 20000
        }
      )
    }).then(function (result) {
      if (result) {
        console.log('success')
        console.log(result)
        let b = web3.fromWei(result.logs[0].args.finalBal.toNumber(), 'ether')
        $('#s_value').text(b)
      } else {
        console.log('failed')
        console.log(result)
      }
    }).catch(function (err) {
      console.log('Error: ', err)
    })
  },

  requestStake: function (value) {
    App.contracts.StakePool.deployed().then(function (instance) {
      return instance.requestNextStakingPeriod()
    }).then(function (trxObj) {
      console.log(trxObj)
    }).catch(function (err) {
      console.error(err)
    })
  },

  requestUnStake: function (value) {
    App.contracts.StakePool.deployed().then(function (instance) {
      // TODO: use estimateGas instead of hard coded value
      return instance.requestExitAtEndOfCurrentStakingPeriod(
        web3.toWei(value, 'ether'),
        {
          from: App.account,
          gas: 100000
        }
      )
    }).then(function (trxObj) {
      console.log(trxObj)
    }).catch(function (err) {
      console.error(err)
    })
  },

  logNetwork: function () {
    web3.version.getNetwork((err, netId) => {
      if (err) {
        console.error(err)
        return
      }
      App.network = netId
      switch (netId) {
        case '1':
          console.log('This is mainnet')
          break
        case '2':
          console.log('This is the deprecated Morden test network.')
          break
        case '3':
          console.log('This is the ropsten test network.')
          break
        case '4':
          console.log('This is the Rinkeby test network.')
          break
        case '42':
          console.log('This is the Kovan test network.')
          break
        case '5777':
          console.log('This is ganache gui test network on hadji.local')
          break
        default:
          console.log('This is an unknown network: ', netId)
      }
    })
    // netId also available with console.log(web3.version.network)
  }

}
