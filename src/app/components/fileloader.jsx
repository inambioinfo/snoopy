var React = require('react');
var rb = require('react-bootstrap');
var Col = rb.Col;
var Row = rb.Row;
var Grid = rb.Grid;
var Button = rb.Button;
var Glyphicon = rb.Glyphicon;
var TabbedArea = rb.TabbedArea;
var TabPane = rb.TabPane;
var Modal = rb.Modal;
var Input = rb.Input;

var FileLoader = React.createClass({
  
  getInitialState() {
    return {
      key: 0
    };
  },

  handleSelect(key) {
    console.log('selected ' + key);
    this.setState({key});

  },


  render: function() {
    var labels = ['HTTP/S', 'Local File', 'Local Server', 'SSH'];
    var loadButtonText = 'Load ' + labels[this.state.key];

    return (
      <div>
        <Modal {...this.props} title={this.props.title} animation={false}>
          <div className='modal-body'>
            <p>{this.props.text}</p>
            <TabbedArea activeKey={this.state.key} onSelect={this.handleSelect}>
              <TabPane eventKey={0} tab='HTTP/S'>
                <HTTPTab />
              </TabPane>
              <TabPane eventKey={1} tab='Local File'>
                <LocalFileTab multiple={this.props.multiple}/>
              </TabPane>
              <TabPane eventKey={2} tab='Local Server'>
                <LocalServerTab />
              </TabPane>
              <TabPane eventKey={3} tab='SSH'>
                <SSHTab />
              </TabPane>
            </TabbedArea>
          </div>
          <div className='modal-footer'>
            <Button bsStyle="primary" onClick={this.props.onRequestHide}>{loadButtonText}</Button>
            <Button onClick={this.props.onRequestHide}>Close</Button>
          </div>
        </Modal>
      </div>
    );
  }
});


var HTTPTab = React.createClass({
  render: function() {
    return (
      <div>
        <p>Load a file that resides on a remote server and can be accessed via HTTP/S.</p>
        <form role="form" onSubmit={this.handleOK}>
          <Input type="text" ref="path" placeholder="...path to file on server"/>
        </form>
      </div>
    );
  }
});

var LocalFileTab = React.createClass({
  
  
  
  render: function() {

    if (this.props.multiple)
      var input = (<input type="file" ref="file" multiple onChange={this.handleLocalLoad}/>);
    else
      var input = (<input type="file" ref="file" onChange={this.handleLocalLoad}/>);

    return (
      <div>
        <p>Load a file that exists on your local machine (e.g. hard drive).</p>
        {input}
      </div>
    );
  }
});


var LocalServerTab = React.createClass({
  render: function() {
    return (
      <div>
        <p>Load a file that exists on a local server that you have started.</p>
        <form role="form" onSubmit={this.handleOK}>
          <Input type="text" ref="path" placeholder="...path to file on server"/>
        </form>
      </div>
    );
  }
});

var SSHTab = React.createClass({
  render: function() {
    return (
      <div>
        <p>Load a file that exists on a local server that cannot be accessed via HTTP/S but can be accessed via SSH. To use this option, an ssh-bridge server must have been started on your local machine.</p>
        <form role="form" onSubmit={this.handleOK}>
          <Input type="text" ref="path" placeholder="...path to file on server"/>
        </form>
      </div>
    );
  }
});

//   id:'localMachine',
          //   tabText: 'Local Machine',
          //   URL: false,
          //   bodyText: 'Load a file that exists on your local machine (e.g. hard drive).'
          // },
          // {
          //   id:'localServer',
          //   tabText: 'Local Server',
          //   URL: '127.0.0.1',
          //   bodyText: 'Load a file that exists on a local server that you\'ve started.'
          // },
          // {
          //   id:'SSH',
          //   tabText: 'SSH Bridge',
          //   URL: 'dr9@farm3-login:',
          //   bodyText: 'Load a file that exists on a local server that cannot be accessed via HTTP/S but can be accessed via SSH. To use this option, an ssh-bridge server must have been started on your local machine.'
          // }



module.exports = FileLoader;