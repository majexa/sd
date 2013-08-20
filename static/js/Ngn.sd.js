Ngn.sd.setMinHeight = function(parent, offset, min) {
  if (!offset) offset = 0;
  if (!min) min = 0;
  var max = 0;
  parent.getChildren().each(function(el) {
    var y = el.getSize().y + parseInt(el.getStyle('top'));
    if (y > max) max = y + offset;
  });
  if (max) {
    if (max < min) max = min;
    parent.sdSetStyle('min-height', max);
  }
};

Ngn.sd.Font = new Class({

  _updateFont: function() {
    if (this.data.font) {
      var s = ['font-size', 'font-family', 'color'];
      for (var i = 0; i < s.length; i++) this.styleEl().sdSetStyle(s[i], '');
      for (i in this.data.font) this.styleEl().sdSetStyle(i.hyphenate(), this.data.font[i]);
      if (this.eStyle) this.eStyle.dispose();
      var color = this.data.font.linkColor || this.data.font.color;
      if (color) {
        var parents = this.styleEl().getParents('.sdEl').filter(function(v) {
          return v.retrieve('obj').linkColor();
        });
        var parentSelector = '';
        if (parents.length > 0) {
          parentSelector = parents.map(function(el) {
            return '.type_' + el.get('data-type') + '.id_' + el.get('data-id');
          }).join(' ') + ' ';
        }
        var selector = '';
        if (this.styleEl().get('data-type') && this.styleEl().get('data-id')) selector = '.type_' + this.styleEl().get('data-type') + '.id_' + this.styleEl().get('data-id');
        selector = parentSelector + selector;
        this.eStyle = new Element('style', {
          type: 'text/css',
          html: selector + ' a { color: ' + color + '; } \n' + (this.defaultFontColor() ? selector + ' a:hover { color: ' + this.defaultFontColor() + '; } ' : '')
        }).inject($('layout'), 'top');
      }
    }
  },

  defaultFontColor: function() {
    return this.data.font.color || false;
  },

  linkColor: function() {
    if (!this.data.font) return false;
    return this.data.font.linkColor || this.data.font.color || false;
  },

  fontSettingsAction: 'json_fontSettings',

  fontSettingsDialogOptions: function() {
    width: 450
  },

  initFont: function() {
    this._updateFont();
    new Ngn.Btn(Ngn.btn2('Настройки шрифта', 'font').inject(this.eBtns), function() {
      new Ngn.sd.FontSettingsDialog($merge({
        dialogClass: 'settingsDialog compactFields dialog',
        id: this.finalData().data.type + this.id(),
        url: this.ctrl + '/' + this.fontSettingsAction + '/' + this.id(),
        onSubmitSuccess: function() {
          this.reload();
        }.bind(this)
      }, this.fontSettingsDialogOptions()));
    }.bind(this));
  },

  styleEl: function() {
    return this.el;
  }

});

Ngn.sd.FontSettingsDialog = new Class({
  Extends: Ngn.Dialog.RequestForm,

  formInit: function() {
    var obj = this;
    this.message.getElement('[name=fontSize]').addEvent('change', function() {
      obj.fireEvent('changeSize', this.get('value'));
    });
    this.message.getElement('[name=color]').addEvent('change', function() {
      obj.fireEvent('changeColor', this.get('value'));
    });
  }

});

Ngn.sd.Items = new Class({

  reload: function() {
    this.loading(true);
    new Ngn.Request.JSON({
      url: this.ctrl + '/json_getItem/' + this.id() + '?ownPageId=' + Ngn.sd.ownPageId,
      onComplete: function(data) {
        this.setData(data);
        this.updateElement();
        this.loading(false);
      }.bind(this)
    }).send();
  },
  id: function() {
    return this.data.id;
  },
  setData: function(data) {
    this.data = data;
  },
  loading: function(flag) {
    Ngn.loading(flag);
  },
  updateElement: function() {
  }

});

Ngn.sd.ElementMeta = new Class({

  initElement: function(el) {
    this.el = el;
    if (!this.id()) return;
    //c(this.finalData().data);
    if (!this.finalData().data.type) throw new Error('this.finalData().data.type');
    this.el.addClass('sdEl').store('obj', this).set('data-id', this.id()).set('data-type', this.finalData().data.type).addClass('type_' + this.finalData().data.type).addClass('id_' + this.id());
  }

});

Ngn.sd.styles = {};

Ngn.sd.buildStyles = function() {
  if (Ngn.sd.eStyle) Ngn.sd.eStyle.dispose();
  var r = {};
  for (var selector in Ngn.sd.styles) {
    var styles = Ngn.sd.styles[selector];
    if (!r[selector]) r[selector] = [];
    for (var property in styles) r[selector].push([property.hyphenate(), styles[property]]);
  }
  var css = '';
  for (var selector in r) {
    css += selector + ' {\n';
    for (var i = 0; i < r[selector].length; i++) {
      css += r[selector][i][0] + ': ' + r[selector][i][1] + ';\n';
    }
    css += '}\n';
  }
  return css;
};

Element.implement({
  sdSetStyle: function(property, value) {
    if (property == 'opacity') {
      setOpacity(this, parseFloat(value));
      return this;
    }
    property = (property == 'float' ? floatName : property).camelCase();
    if (typeOf(value) != 'string') {
      var map = (Element.Styles[property] || '@').split(' ');
      value = Array.from(value).map(function(val, i) {
        if (!map[i]) return '';
        return (typeOf(val) == 'number') ? map[i].replace('@', Math.round(val)) : val;
      }).join(' ');
    } else if (value == String(Number(value))) {
      value = Math.round(value);
    }
    var cls = this.get('class');
    if (cls) cls = cls.replace(/\s*dynamicStyles\s*/, '');
    if (this.hasClass('sdEl')) {
      var selector = '.' + cls.replace(/(\s+)/g, '.');
    } else {
      var eParent = this.getParent('.sdEl');
      if (eParent) var pCls = this.getParent('.sdEl').get('class').replace(/\s*dynamicStyles\s*/, '');
      var selector = (pCls ? '.' + pCls.replace(/(\s+)/g, '.') : '') + ' ' + (cls ? '.' + cls : this.get('tag'));
    }
    if (value) {
      if (!Ngn.sd.styles[selector]) Ngn.sd.styles[selector] = {};
      if (!this.hasClass('dynamicStyles')) this.addClass('dynamicStyles');
      Ngn.sd.styles[selector][property] = value;
      this.style[property] = value;
    }
  },
  sdSetPosition: function(obj) {
    return this.sdSetStyles(this.computePosition(obj));
  },
  sdSetStyles: function(styles) {
    for (var style in styles) this.sdSetStyle(style, styles[style]);
  }
});

Ngn.sd.BlockAbstract = new Class({
  Implements: [Options, Ngn.Class, Ngn.sd.ElementMeta, Ngn.sd.Items],
  defaultData: false,
  finalData: function() {
    return this.defaultData ? $merge(this.defaultData, this._data) : this._data;
  },
  setData: function(data) {
    if (!data) throw new Error('empty data');
    this._data = this.defaultData ? $merge(this.defaultData(), data) : data;
    this.data = data.data;
  },
  id: function() {
    return this._data.id;
  },
  initialize: function(el, data, event, options) {
    this.setData(data);
    this.initElement(el);
    this.addCont(this.el);
    this.event = event;
    this.setOptions(options);
    this.ctrl = '/pageBlock';
    this.init();
  },
  delete: function() {
    this.el.dispose();
  },
  addCont: function(el) {
    new Element('div', {'class': 'cont'}).inject(el);
  },
  updateContainerHeight: function() {
    Ngn.sd.updateContainerHeight(this.container());
  },
  updateElement: function() {
    this._updateFont();
    this.updateContainerHeight();
    this.el.set('data-id', this.id());
    this.replaceContent();
    this.updateSize();
    window.fireEvent('resize');
  },
  eLastContainer: false,
  _container: function() {
    return this.el.getParent();
  },
  container: function() {
    var eContainer = this._container();
    if (!eContainer && this.eLastContainer) return this.eLastContainer;
    if (!eContainer.hasClass('container')) throw new Error('Block has no container');
    return this.eLastContainer = eContainer;
  },
  inject: function(eContainer) {
    this.setPosition(Ngn.positionDiff(this.el.getPosition(), eContainer.getPosition(), -1));
    if (!this._container() || this._container() != eContainer) {
      this.el.inject(eContainer);
    }
    return this;
  },
  setPosition: function(position) {
    this.data.position = $merge(this.data.position, position);
    this.el.sdSetPosition(this.data.position);
  },
  getDataForSave: function(create) {
    var eContainer = this.container();
    this.data = $merge(this.data, {
      ownPageId: Ngn.sd.ownPageId,
      containerId: eContainer.retrieve('data').id
    });
    this.loading(true);
    // this._data.data - исходные изменяемые данные
    // this.data - текущие несохраненные данные
    if (create) {
      this._data.data = $merge(this._data.data, this.data);
      var p = { data: this._data };
      delete p.data.html;
    } else {
      var p = {
        id: this._data.id,
        data: this.data
      };
    }
    return p;
  },
  save: function(create) {
    new Ngn.Request.JSON({
      url: this.ctrl + '/json_' + (create ? 'create' : 'update') + '?ownPageId=' + Ngn.sd.ownPageId,
      onComplete: function(data) {
        this.setData(data);
        if (create) this.initElement(this.el);
        this.updateElement();
        this.loading(false);
      }.bind(this)
    }).post(this.getDataForSave(create));
  },
  replaceContent: function() {
    if (!this._data.html) return;
    this.el.getElement('.cont').set('html', this._data.html);
    this.el.getElement('.cont').getElements('a').addEvent('click', function(e) {
      e.preventDefault()
    });
  }
});

Ngn.sd.BlockPreview = new Class({
  Extends: Ngn.sd.BlockAbstract,
  options: {
    action: 'create'
  },
  init: function() {
    this.el.addClass('blockPreview');
    new Ngn.sd.BlockDragNew(this);
  },
  updateElement: function() {
    Ngn.sd.block(Ngn.sd.elBlock().inject(this.container()), this._data);
    this.el.destroy();
  }
});


Ngn.sd.TranslateDragEvents = new Class({

  translateDragEvents: function() {
    return {
      onStart: this.onStart.bind(this),
      onDrag: this.onDrag.bind(this),
      onComplete: this.onComplete.bind(this)
    }
  }

});

Ngn.sd.BlockDraggableProgress = {};

Ngn.sd.BlockDraggable = new Class({

  Implements: [Ngn.sd.TranslateDragEvents],

  name: 'default',

  initialize: function(block) {
    this.block = block;
    this.eHandle = this.getHandleEl();
    this.init();
    new Drag(new Element('div'), $merge({
      handle: this.eHandle,
      snap: 0,
      stopPropagation: true
    }, this.translateDragEvents()))
  },

  init: function() {
  },

  getHandleEl: function() {
    return Elements.from('<div class="btn' + (this.name.capitalize()) + ' control"></div>')[0].inject(this.block.el, 'top');
  },

  onStart: function(el, e) {
    Ngn.sd.BlockDraggableProgress[this.name] = true;
  },

  onComplete: function() {
    delete Ngn.sd.BlockDraggableProgress[this.name];
    this.block.updateContainerHeight();
    window.fireEvent(this.name);
    this.block.save();
  }

});

Ngn.sd.BlockResize = new Class({
  Extends: Ngn.sd.BlockDraggable,

  name: 'resize',

  onStart: function(el, e) {
    this.parent(el, e);
    this.offset = this.block.el.getPosition();
  },

  onDrag: function(el, e) {
    this.block.resize({
      y: e.event.pageY - this.offset.y,
      x: e.event.pageX - this.offset.x
    });
  }

});

Ngn.sd.BlockRotate = new Class({
  Extends: Ngn.sd.BlockDraggable,

  name: 'rotate',

  init: function() {
    this.block.data.rotate = this.block.data.rotate || 0;
    if (this.block.data.rotate) this.block.rotate(this.block.data.rotate);
  },
  onStart: function(el, e) {
    this.parent(el, e);
    this.startY = e.event.pageY;
  },
  onDrag: function(el, e) {
    this.curRotate = this.block.data.rotate - (this.startY - e.event.pageY);
    this.block.rotate(this.curRotate);
  }

});

Ngn.sd.blocks = {};
Ngn.sd.BlockB = new Class({
  Extends: Ngn.sd.BlockAbstract,
  Implements: [Ngn.sd.Font],
  options: {
    action: 'update'
  },
  className: function() {
    return 'Ngn.sd.BlockB' + ucfirst(this.data.type);
  },
  setData: function(data) {
    if (data.html === undefined) throw new Error('undefined data.html');
    this.parent(data);
  },
  styleEl: function() {
    return this.el.getElement('.cont');
  },
  delete: function() {
    this.parent();
    this.updateContainerHeight();
  },
  init: function() {
    Ngn.sd.blocks[this._data.id] = this;
    var eContainer = this.container();
    this.el.sdSetPosition(this.data.position);
    this.initControls();
    this.replaceContent();
    this.updateSize();
    Ngn.sd.setMinHeight(eContainer);
  },
  rotate: function(deg) {
    var eCont = this.el.getElement('.cont');
    eCont.sdSetStyle('transform', 'rotate(' + deg + 'deg)');
    eCont.sdSetStyle('-ms-transform', 'rotate(' + deg + 'deg)');
    eCont.sdSetStyle('-webkit-transform', 'rotate(' + deg + 'deg)');
    this.data.rotate = deg;
  },
  initCopyCloneBtn: function() {
    if (this.finalData().data.type == 'image') {
      this.initCloneBtn();
    } else {
      this.initCopyBtn();
    }
  },
  initCopyBtn: function() {
    new Ngn.Btn(Ngn.btn2('Копировать', 'copy').inject(this.eBtns, 'top'), function() {
      var data = Object.clone(this._data);
      data.data.position.x += 50;
      data.data.position.y += 50;
      delete data.id;
      Ngn.sd.block(Ngn.sd.elBlock().inject(this.container()), data).save(true);
    }.bind(this));
  },
  initCloneBtn: function() {
    new Ngn.Btn(Ngn.btn2('Клонировать', 'copy').inject(this.eBtns, 'top'), function() {
      var data = {
        data: {
          position: {
            x: this._data.data.position.x + 20,
            y: this._data.data.position.y + 20
          },
          containerId: this.data.containerId,
          type: 'clone',
          refId: this._data.id,
          size: this._data.data.size
        },
        html: this._data.html
      };
      Ngn.sd.block(Ngn.sd.elBlock().inject(this.container()), data).save(true);
    }.bind(this));
  },
  initBtnsHide: function() {
    this.eBtns.setStyle('display', 'none');
    this.el.addEvent('mouseover', function() {
      if (Object.values(Ngn.sd.BlockDraggableProgress).length) return;
      if (Ngn.sd.isPreview()) return;
      if (Ngn.sd.movingBlock.get()) return;
      this.eBtns.setStyle('display', 'block');
    }.bind(this));
    this.el.addEvent('mouseout', function() {
      if (Object.values(Ngn.sd.BlockDraggableProgress).length) return;
      if (Ngn.sd.movingBlock.get()) return;
      this.eBtns.setStyle('display', 'none');
    }.bind(this));
  },
  initBtns: function() {
    this.eBtns = new Element('div', {'class': 'btnSet'}).inject(this.el, 'top');
    new Ngn.Btn(Ngn.btn2('Удалить', 'delete').inject(this.eBtns, 'top'), function() {
      if (!Ngn.confirm()) return;
      this.loading(true);
      new Ngn.Request.JSON({
        url: this.ctrl + '/json_delete/' + this.id(),
        onComplete: function() {
          this.loading(false);
          this.delete();
        }.bind(this)
      }).send();
    }.bind(this));
    if (this.finalData().data.type != 'image') new Ngn.Btn(Ngn.btn2('Редактировать', 'edit').inject(this.eBtns, 'top'), this.editAction.bind(this));
    this.initCopyCloneBtn();
    Ngn.btn2Flag(this.global(), {
      title: 'Блок глобальный. Нажмите, что бы сделать локальным',
      cls: 'global',
      url: '/pageBlock/ajax_updateGlobal/' + this._data.id + '/0'
    }, {
      title: 'Блок локальный. Нажмите, что бы сделать глобальным',
      cls: 'local',
      url: '/pageBlock/ajax_updateGlobal/' + this._data.id + '/1'
    }).inject(this.eBtns, 'top');
    if (Ngn.sd.getBlockType(this.finalData().data.type).separateContent) {
      Ngn.btn2Flag(this.data.separateContent, {
        title: 'Блок имеет отдельный текст для каждого раздела. Сделать общий текст для всех разделов',
        cls: 'dynamic',
        url: '/pageBlock/ajax_updateSeparateContent/' + this._data.id + '/0',
        confirm: 'Тексты для всех, кроме самого первого раздела будут удалены. Вы уверены?'
      }, {
        title: 'Блок имеет общий текст для всех разделов. Сделать отдельный текст для каждого раздела',
        cls: 'static',
        url: '/pageBlock/ajax_updateSeparateContent/' + this._data.id + '/1'
      }).inject(this.eBtns, 'top');
    }
  },
  global: function() {
    if (this.data.global !== undefined) return this.data.global;
    return Ngn.sd.blockContainers[this.data.containerId].data.global;
  },
  editAction: function() {
    Ngn.sd.previewSwitch(true);
    var cls = this.editDialogClass();
    new cls($merge($merge({
      url: this.ctrl + '/json_edit/' + this._data.id + '?ownPageId=' + Ngn.sd.ownPageId,
      dialogClass: 'settingsDialog dialog',
      title: 'Редактирование (ID ' + this._data.id + ')',
      width: 500,
      // force: false,
      onClose: function() {
        Ngn.sd.previewSwitch(false);
      },
      onSubmitSuccess: function() {
        this.reload();
      }.bind(this)
    }, Ngn.sd.getBlockType(this.data.type).editDialogOptions || {}), this.editDialogOptions()))
  },
  editDialogClass: function() {
    return Ngn.Dialog.RequestForm;
  },
  editDialogOptions: function() {
    return {};
  },
  initControls: function() {
    this.initBtns();
    this.initBtnsHide();
    this.initDrag();
    new Ngn.sd.BlockResize(this);
    this.initFont();
  },
  initDrag: function() {
    this.eDrag = Elements.from('<a class="btn control drag dragBox2" data-move="1" title="Передвинуть блок"></a>')[0].inject(this.eBtns, 'top');
    this.drag = new Ngn.sd.BlockDrag(this);
  },
  updateSize: function() {
    if (!this.finalData().data.size) return;
    this._resize(this.finalData().data.size);
  },
  _resize: function(size) {
    if (size.x) this.el.sdSetStyle('width', size.x + 'px');
    if (size.y) this.el.sdSetStyle('height', size.y + 'px');
    var eCont = this.el.getElement('.cont');
    if (size.x) eCont.sdSetStyle('width', size.x + 'px');
    if (size.y) eCont.sdSetStyle('height', size.y + 'px');
  },
  resize: function(size) {
    this._resize(size);
    this.data = $merge(this.data, {size: size});
  },
  move: function(d) {
    var r = {
      up: ['y', -1],
      down: ['y', 1],
      left: ['x', -1],
      right: ['x', 1]
    };
    var p = {};
    p[r[d][0]] = this.data.position[r[d][0]] + r[d][1];
    this.setPosition(p);
    clearTimeout(this.timeoutId);
    this.timeoutId = this.save.bind(this).delay(1000);
  }
});


Ngn.sd.BlockBImage = new Class({
  Extends: Ngn.sd.BlockB,

  replaceContent: function() {
    this.parent();
    var eImg = this.el.getElement('img');
    eImg.set('src', eImg.get('src') /*+ '?' + Math.random(1000)*/);
  },

  initControls: function() {
    this.parent();
    new Ngn.sd.BlockRotate(this);
  },

  initFont: function() {
  }

});

Ngn.sd.BlockBSvg = new Class({
  Extends: Ngn.sd.BlockB,

  editDialogOptions: function() {
    return {
      onChangeSvg: function(value) {
        this.el.getElement('.cont').set('html', Ngn.sd.itemTpl('svgSelect', value)); // 'svgSelect' -> 'svgItems'
      }.bind(this),
      onChangeColor: function(color) {
        this.setColor(color);
      }.bind(this),
      // штука ниже должна генериться сама
      formEvents: [
        {
          fieldName: 'color',
          fieldEvent: 'change',
          formEvent: 'changeColor'
        }
      ]
    }
  },

  _setColor: function(color, n) {
    if (!n) n = 0;
    this.colors[n] = color;
  },

  setColor: function(color, n) {
    this._setColor(color, n);
    this._data.content.color = color;
    this.fillPaths();
  },

  fillPaths: function() {
    if (!this.colors.length) return;
    this.el.getElements('path').each(function(el) {
      el.setStyle('fill', this.colors[0]);
    }.bind(this));
  },

  initColors: function() {
    this.colors = (this._data.content && this._data.content.color) ? [this._data.content.color] : [];
    if (this.colors.length) {
      for (var i; i < this.colors.length; i++) {
        this._setColor(this.colors.colors[i], i);
      }
    }
    this.fillPaths();
  },

  init: function() {
    this.parent();
    this.initColors();
    new Ngn.sd.BlockRotate(this);
  },

  updateElement: function() {
    this.initColors();
  },

  initFont: function() {
  }

});

Ngn.sd.BlockBFont = new Class({
  Extends: Ngn.sd.BlockB,
  fontSettingsAction: 'json_cufonSettings',
  fontSettingsDialogOptions: function() {
    return {
      width: 350,
      savePosition: true,
      onChangeFont: function(font) {
        Cufon.set('fontFamily', font).replace(this.styleEl());
      }.bind(this),
      onChangeSize: function(size) {
        Cufon.set('fontSize', size).replace(this.styleEl());
      }.bind(this),
      onChangeColor: function(color) {
        Cufon.set('color', color).replace(this.styleEl());
      }.bind(this),
      onCancelClose: function() {
        if (this.data.font && this.data.font.fontFamilyCufon) {
          Cufon.set('fontFamily', this.data.font.fontFamilyCufon).replace(this.styleEl());
        } else {
          this.styleEl().set('html', this.data.html);
        }
      }.bind(this)
    };
  },
  replaceFont: function() {
    this._updateFont();
    Ngn.sd.BlockBFont.html[this.id()] = this._data.html;
    this.loadFont(function() {
      this.el.set('data-fontFamily', this.data.font.fontFamilyCufon);
      Cufon.set('fontFamily', this.data.font.fontFamilyCufon).replace(this.styleEl());
      Ngn.loading(false);
    }.bind(this));
  },
  updateFont: function() {
    this._updateFont();
    Ngn.sd.BlockBFont.html[this.id()] = this.data.html;
    this.loadFont(function() {
      this.el.set('data-fontFamily', this.data.font.fontFamilyCufon);
      Cufon.set('fontFamily', this.data.font.fontFamilyCufon).refresh(this.styleEl());
      Ngn.loading(false);
    }.bind(this));
  },
  loadFont: function(onLoad) {
    if (!this.data.font || !this.data.font.fontFamilyCufon) return;
    Ngn.loading(true);
    Ngn.sd.loadFont(this.data.font.fontFamilyCufon, onLoad);
  },
  replaceContent: function() {
    this.parent();
    this.replaceFont();
  },
  initControls: function() {
    this.parent();
    new Ngn.sd.BlockRotate(this);
    this.initSlider();
  },
  initSlider: function() {
    return;
    var eSlider = Elements.from('<div class="slider"><div class="knob"></div></div>')[0].inject(this.eBtns);
    new Slider(eSlider, eSlider.getElement('.knob'), {
      dragOptions: {
        stopPropagation: true
      },
      range: [9, 250],
      initialStep: this.data.font && this.data.font.fontSize ? this.data.font.fontSize.toInt() : 14,
      onChange: function(size) {
        this.data.font.fontSize = size + 'px';
        this.updateFont();
        Cufon.refresh(this.styleEl());
      }.bind(this),
      onComplete: function() {
        this.save();
      }.bind(this)
    });
  }
});
Ngn.sd.BlockBFont.html = {};

Ngn.sd.BlockBClone = new Class({
  Extends: Ngn.sd.BlockB,
  finalData: function() {
    return Ngn.sd.blocks[this._data.data.refId]._data;
  },
  initCopyCloneBtn: function() {
  },
  initResize: function() {
  },
  getDataForSave: function(create) {
    var p = this.parent(create);
    if (p.data.data && p.data.data.size) delete p.data.data.size;
    return p;
  }
});

Ngn.sd.BlockBBlog = new Class({
  Extends: Ngn.sd.BlockB,

  initBtns: function() {
    this.parent();
    new Ngn.Btn(Ngn.btn2('Настройки блога', 'settings').inject(this.eBtns, 'top'), function() {
      new Ngn.Dialog.RequestForm({
        url: '/blogSettings',
        dialogClass: 'settingsDialog compactFields dialog',
        width: 400
      });
    });
  },
  _resize: function(size) {
    delete size.y;
    this.parent(size);
  },
  replaceContent: function() {
    this.parent();
    this.el.getElements('.pNums a').each(function(el) {
      el.addEvent('click', function(e) {
        new Event(e).stop();
        new Ngn.Request({
          url: el.get('href').replace(/^\/(\w+)\//g, '/blog/'),
          onComplete: function() {
          }
        }).send();
      });
    });
  },
  editAction: function() {
    new Ngn.Grid.Dialog.Request({
      title: 'Редактирование записей блога',
      width: 800,
      gridOpts: {
        basePath: '/blog',
        menu: [ Ngn.Grid.menu.new ],
        toolActions: Ngn.Grid.toolActions,
        onReloadComplete: function() {
          this.reload();
        }.bind(this)
      }
    });
  }

});

Ngn.sd.BlockBButton = new Class({
  Extends: Ngn.sd.BlockB,

  defaultData: function() {
    return {
      size: {
        x: 150,
        y: 40
      }
    };
  },

  _resize: function(size) {
    this.el.getElement('.btn').sdSetStyles({
      width: size.x + 'px',
      height: size.y + 'px'
    });
    var eSpan = this.el.getElement('.btn span');
    eSpan.sdSetStyle('margin-top', (Math.floor(size.y / 2 - (eSpan.getSize().y / 2)) - 1) + 'px');
    this.parent(size);
  }

});

// factory
Ngn.sd.block = function(el, data) {
  var cls = 'Ngn.sd.BlockB' + ucfirst(data.data.type);
  var o = eval(cls);
  cls = o || Ngn.sd.BlockB;
  return new cls(el, data);
};

Ngn.sd.BlockDragAbstract = new Class({
  initialize: function(block) {
    this.block = block;
    this.drag = new Drag.Move(this.block.el, this.getDragOptions());
    this.startPos = {};
    this.init();
  },
  init: function() {
  },
  create: false,
  getDragOptions: function() {
    return {
      droppables: '#layout .container',
      onStart: function(eBlock) {
        this.start(eBlock);
      }.bind(this),
      onDrop: function(eBlock, eContainer) {
        this.drop(eBlock, eContainer);
      }.bind(this),
      onEnter: function(eBlock, eContainer) {
        //if (!$('layout').hasClass('preview')) eContainer.sdSetStyle('border-color', '#000');
      },
      onLeave: function(eBlock, eContainer) {
        //if (!$('layout').hasClass('preview')) eContainer.sdSetStyle('border-color', '#F00');
      }
    };
  },
  drop: function(eBlock, eContainer) {
    if (!eContainer) {
      this.cancel();
      return;
    }
    window.fireEvent('resize');
    this.block.inject(eContainer);
    this.block.updateContainerHeight();
    this.block.save(this.create);
  },
  start: function(eBlock) {
  },
  cancel: function() {
  }
});

Ngn.sd.BlockDragNew = new Class({
  Extends: Ngn.sd.BlockDragAbstract,
  create: true,
  init: function() {
    this.drag.start(this.block.event);
  },
  cancel: function() {
    this.block.delete();
  }
});


Ngn.sd.blockDraggin = false;

Ngn.sd.BlockDrag = new Class({
  Extends: Ngn.sd.BlockDragAbstract,
  initialize: function(block) {
    this.block = block;
    this.block.eDrag.addEvent('click', function() {
      if (this.dragging) return;
      Ngn.sd.movingBlock.toggle(block);
    }.bind(this));
    this.drag = new Drag.Move(this.block.el, this.getDragOptions());
    this.startPos = {};
    this.init();
  },
  dragging: false,
  start: function(eBlock) {
    this.dragging = true;
    Ngn.sd.blockDraggin = true;
    this.startPos = eBlock.getPosition(this.block.container());
    Ngn.sd.movingBlock.cancel();
  },
  drop: function(eBlock, eContainer) {
    (function() {
      this.dragging = false;
      Ngn.sd.blockDraggin = false;
    }.bind(this)).delay(10);
    var eCurContainer = this.block.container();
    this.parent(eBlock, eContainer);
    if (eCurContainer != eContainer) Ngn.sd.updateContainerHeight(eCurContainer);
  },
  cancel: function() {
    this.dragging = false;
    this.block.el.sdSetPosition(this.startPos);
  }
});

Ngn.sd.elBlock = function() {
  return new Element('div', {'class': 'block'});
};

// data: id
Ngn.sd.ContainerAbstract = new Class({
  Implements: [Options, Ngn.Class, Ngn.sd.ElementMeta, Ngn.sd.Font, Ngn.sd.Items],
  type: null,
  options: {
    disableFont: false
  },
  finalData: function() {
    return { data: this.data };
  },
  initialize: function(data, options) {
    this.setOptions(options);
    this.data = data;
    this.afterData();
    this.ctrl = '/' + this.type;
    this.data.type = this.type;
    this.initElement(this.getEl());
    this.el.store('data', data);
    if (!this.data.position) this.data.position = {x: 0, y: 0};
    this.setPosition(this.data.position);
    this.initControls();
    //this.initFont();
  },
  afterData: function() {
  },
  btns: {},
  initControls: function() {
    this.eBtns = new Element('div', {'class': 'btnSet'}).inject(this.el);
    new Element('div', { 'class': 'ctrlTitle', html: this.id() + ':' }).inject(this.eBtns);
    this.initDrag();
    this.btns.deleteBg = new Ngn.Btn(Ngn.btn2('Удалить фон', 'delete').inject(this.eBtns), function() {
      if (!Ngn.confirm()) return;
      this.loading(true);
      new Ngn.Request.JSON({
        url: this.ctrl + '/json_removeBg/' + this.id(),
        onComplete: function() {
          this.loading(false);
          this.setBg(false);
        }.bind(this)
      }).send();
    }.bind(this));
    if (!this.options.disableFont) this.initFont();
    new Ngn.Btn(Ngn.btn2('Настройки фона', 'bgSettings').inject(this.eBtns), function() {
      new Ngn.Dialog.RequestForm({
        dialogClass: 'settingsDialog compactFields dialog',
        width: 450,
        url: this.ctrl + '/json_bgSettings/' + this.id(),
        onSubmitSuccess: function() {
          this.reload();
        }.bind(this)
      });
    }.bind(this));
    new Ngn.Btn(Ngn.btn2('Задать фон', 'image').inject(this.eBtns), null, {
      fileUpload: {
        url: this.ctrl + '/json_uploadBg/' + this.id(),
        onRequest: function() {
          this.loading(true);
        }.bind(this),
        onComplete: function(r) {
          this.loading(false);
          this.setBg(r.url + '?' + Math.random(1000));
        }.bind(this)
      }
    });
    this.setBg(this.data.bg || false);
  },
  toggleBtns: function() {
    this.btns.deleteBg.toggleDisabled(!!this.data.bg);
  },
  initDrag: function() {
    var eDrag = Elements.from('<div class="drag dragBox" title="Передвинуть фон"></div>')[0].inject(this.eBtns);
    var startCursorPos;
    new Drag(eDrag, {
      snap: 0,
      onStart: function(el, e) {
        startCursorPos = [e.event.clientX, e.event.clientY];
      },
      onDrag: function(el, e) {
        this.curPosition = {
          x: this.data.position.x + startCursorPos[0] - e.event.clientX,
          y: this.data.position.y + startCursorPos[1] - e.event.clientY
        };
        this.setPosition(this.curPosition);
      }.bind(this),
      onComplete: function(el) {
        this.data.position = this.curPosition;
        this.save();
      }.bind(this)
    });
  },
  setBg: function(url) {
    if (url) this.data.bg = url; else delete this.data.bg;
    this.refreshBg();
  },
  refreshBg: function() {
    var s = ['color'];
    for (var i = 0; i < s.length; i++) this.styleEl().sdSetStyle('background-' + s[i], '');
    if (this.data.bgSettings) for (var i in this.data.bgSettings) this.styleEl().sdSetStyle('background-' + i, this.data.bgSettings[i]);
    this.el.sdSetStyle('background-image', this.data.bg ? 'url(' + this.data.bg + '?' + this.data.dateUpdate + ')' : 'none');
    this.toggleBtns();
  },
  save: function(create) {
    var data = this.data;
    if (data.bg) delete data.bg;
    this.loading(true);
    new Ngn.Request.JSON({
      url: this.ctrl + '/json_' + (create ? 'create' : 'update'),
      onComplete: function() {
        this.loading(false);
      }.bind(this)
    }).post({ data: data });
  },
  updateElement: function() {
    this.refreshBg();
    this._updateFont();
  },
  setPosition: function(position) {
    if (!position.x && !position.y) {
      this.el.sdSetStyle('background-position', '');
      return;
    }
    this.el.sdSetStyle('background-position', (-position.x) + 'px ' + (-position.y) + 'px');
  },
  loading: function(flag) {
    Ngn.loading(flag);
  }
});

Ngn.sd.BlockContainer = new Class({
  Extends: Ngn.sd.ContainerAbstract,
  type: 'blockContainer',
  getEl: function() {
    var eParent = $('layout2').getElement('.lCont');
    var eContainer = new Element('div', {'class': 'container'});
    if (this.data.wrapper) {
      if ($(this.data.wrapper)) eParent = $(this.data.wrapper); else {
        eParent = new Element('div', {id: this.data.wrapper, 'class': this.data.wrapper}).inject(eParent);
        new Element('div', {'class': 'clear clear_' + this.data.wrapper}).inject(eParent);
      }
      eContainer.inject(eParent.getElement('.clear_' + this.data.wrapper), 'before');
    } else {
      eContainer.inject(eParent);
    }
    return eContainer;
  }
});

Ngn.sd.Layout = new Class({
  Extends: Ngn.sd.ContainerAbstract,
  type: 'layout',
  options: {
    disableFont: true,
    cls: false
  },
  getEl: function() {
    if (!this.data.parent) throw new Error('parent not defined in ' + this.id() + ' layout');
    if (!$(this.data.parent)) throw new Error(this.data.parent + ' not found');
    var el = new Element('div', {
      id: this.id(),
      'class': 'layout' + (this.options.cls ? ' ' + this.options.cls : '')
    }).inject($(this.data.parent));
    return el;
  }
});

Ngn.sd.LayoutContent = new Class({
  Extends: Ngn.sd.ContainerAbstract,
  type: 'layoutContent',
  getEl: function() {
    return new Element('div', {
      'class': 'lCont'
    }).inject($('layout2'));
  },
  defaultFontColor: function() {
    return '#000';
  }
});

Ngn.sd.blockTypes = [
  {
    title: 'Текст',
    data: {
      type: 'text'
    },
    separateContent: true,
    editDialogOptions: {
      dialogClass: 'dialog elNoPadding',
      vResize: Ngn.Dialog.VResize.Wisiwig
    }
  },
  {
    title: 'Шрифт',
    data: {
      type: 'font'
    },
    editDialogOptions: {
      dialogClass: 'dialog elNoPadding',
      vResize: true
    }
  },
  {
    title: 'Клипарт',
    data: {
      type: 'svg'
    },
    editDialogOptions: {
      width: 250
    }
  },
  {
    title: 'Меню',
    data: {
      type: 'menu'
    }
  },
  /*
   {
   title: 'Блог',
   data: {
   type: 'blog'
   }
   },
   */
  {
    title: 'Кнопка',
    data: {
      type: 'button'
    },
    editDialogOptions: {
      'dialogClass': 'settingsDialog compactFields dialog'
    }
  }
];

Ngn.sd.getBlockType = function(type) {
  for (var i = 0; i < Ngn.sd.blockTypes.length; i++) {
    if (Ngn.sd.blockTypes[i].data.type == type) return Ngn.sd.blockTypes[i];
  }
  for (var i = 0; i < Ngn.sd.blockUserTypes.length; i++) {
    if (Ngn.sd.blockUserTypes[i].data.type == type) return Ngn.sd.blockUserTypes[i];
  }
  return false;
};

Ngn.sd.exportLayout = function() {
  var eLayout = $('layout').clone();
  eLayout.getElements('.btnSet').dispose();
  eLayout.getElements('.btnResize').dispose();
  eLayout.getElements('.block.type_font').each(function(eBlock) {
    eBlock.getElement('.cont').set('html', Ngn.sd.BlockBFont.html[eBlock.get('data-id')]);
  });
  eLayout.getElements('.dynamicStyles').set('style', '').removeClass('dynamicStyles');
  // replace dynamic blocks content
  eLayout.getElements('.block').each(function(eBlock) {
    // разобраться в этом куске
    if (!Ngn.sd.blocks[eBlock.get('data-id')]) return;
    var type = Ngn.sd.blocks[eBlock.get('data-id')].finalData().data.type;
    if (Ngn.sd.getBlockType(type).dynamic) {
      var eStyle = eBlock.getElement('style');
      eStyle.inject(eBlock.getElement('.cont').set('html', '{tplBlock:' + eBlock.get('data-id') + '}'), 'top');
    }
  });
  new Element('style', {
    type: 'text/css',
    html: Ngn.sd.buildStyles()
  }).inject(eLayout, 'top');
  return eLayout.get('html');
};

Ngn.sd.ownPageId = 0;
Ngn.sd.blockUserTypes = [];

Ngn.sd.initUserTypes = function(types) {
  if (!types.length) return;
  new Ngn.sd.UserPanel(types);
  Ngn.sd.blockUserTypes = types;
};

Ngn.sd.loadData = function(ownPageId, onComplete) {
  onComplete = onComplete || function() {
  };
  if ($('layout1')) $('layout1').dispose();
  Ngn.sd.ownPageId = ownPageId;
  Ngn.loading(true);
  Ngn.sd.blockContainers = {};
  new Ngn.Request.JSON({
    url: '/cpanel/json_get?ownPageId=' + ownPageId,
    onComplete: function(data) {
      Ngn.sd.initUserTypes(data.blockUserTypes);
      for (var i = 0; i < data.items.layout.length; i++) {
        new Ngn.sd.Layout(data.items.layout[i], {
          cls: i == 0 ? data.layout : ''
        });
      }
      for (var i = 0; i < data.items.layoutContent.length; i++) {
        new Ngn.sd.LayoutContent(data.items.layoutContent[i]);
      }
      for (var i = 0; i < data.items.blockContainer.length; i++) {
        var v = data.items.blockContainer[i];
        Ngn.sd.blockContainers[v.id] = new Ngn.sd.BlockContainer(v);
      }
      Ngn.sd.blocks = {};
      for (var i = 0; i < data.items.pageBlock.length; i++) {
        var v = data.items.pageBlock[i];
        var container = Ngn.sd.blockContainers[v.data.containerId];
        if (Ngn.sd.blockContainers[v.data.containerId]) {
          Ngn.sd.blocks[v.id] = Ngn.sd.block(Ngn.sd.elBlock().inject(Ngn.sd.blockContainers[v.data.containerId].el), v);
        }
      }
      Ngn.sd.updateLayoutContentHeight();
      Ngn.sd.setPageTitle(ownPageId);
      Ngn.initTips('.btn,.btnBlock,.logo,.smIcons,.dragBox');
      Ngn.loading(false);
      window.fireEvent('resize');
      onComplete(ownPageId);
    }
  }).send();
};

Ngn.sd.PageBlocksShift = new Class({

  back: function(id) {
    var ePrev = Ngn.sd.blocks[id].el.getPrevious('.block');
    if (ePrev) {
      Ngn.sd.blocks[id].el.inject(ePrev, 'before');
      this.updateOrder(id);
    }
  },
  forward: function(id) {
    var eNext = Ngn.sd.blocks[id].el.getNext('.block');
    if (eNext) {
      Ngn.sd.blocks[id].el.inject(eNext, 'after');
      this.updateOrder(id);
    }
  },
  updateOrder: function(id) {
    var esBlocks = Ngn.sd.blocks[id].el.getParent().getElements('.block');
    var ids = [];
    for (var i=0; i<esBlocks.length; i++) ids.push(esBlocks[i].get('data-id'));
    new Ngn.Request({
      url: '/pageBlock/ajax_updateOrder'
    }).post({
      containerId: Ngn.sd.blocks[id].data.containerId,
      ids: ids
    });
  }

});

Ngn.sd.PagesSet = new Class({
  Extends: Ngn.FieldSet,

  initRows: function() {
    this.parent();
    for (var i = 0; i < this.esRows.length; i++) {
      this.createRowButton(this.esRows[i], {
        caption: 'Перейти к редактированию раздела',
        cls: 'edit'
      }, function() {
        Ngn.sd.loadData(this.options.n);
      }, {
        n: this.esRows[i].retrieve('n')
      });
    }
  }

});

Ngn.sd.pages = {};

Ngn.sd.setPageTitle = function(n) {
  return;
  if (Ngn.sd.pages[n]) $('pageTitle').set('html', Ngn.sd.pages[n]);
};

Ngn.sd.UserPanel = new Class({

  initialize: function(blockUserTypes) {
    var eBlocksPanel = new Element('div', {
      'class': 'dropRightMenu extraBlocks'
    }).inject(Ngn.sd.ePanel, 'after');
    new Element('div', { 'class': 'tit', html: 'Ещё' }).inject(eBlocksPanel);
    Ngn.sd.buildBlockBtns(blockUserTypes, eBlocksPanel);
    new Ngn.HidebleBar.V(eBlocksPanel);
  }

});

Ngn.sd.buildBlockBtns = function(blockTypes, eCont) {
  blockTypes.each(function(data) {
    var btn = new Element('div', {
      'class': 'btnBlock move type_' + data.data.type,
      title: data.title
    }).inject(eCont);
    btn.addEvent('mousedown', function(event) {
      event.stop();
      new Ngn.sd.BlockPreview(Ngn.sd.elBlock().inject(document.body).setPosition(btn.getPosition()), { data: data.data }, event);
    });
  });
}

Ngn.sd.buildPanel = function() {
  Ngn.sd.ePanel = new Element('div', {'class': 'cont'}).inject($('panel'));
  new Ngn.Request.JSON({
    url: '/pages/json_getItems',
    onComplete: function(r) {
      var data = [];
      for (var i = 0; i < r.name.length; i++) {
        data.push({ name: r.name[i] });
        Ngn.sd.pages[i + 1] = r.name[i];
      }
      // ================================ pages panel =============================
      var ePages = new Element('div', { id: 'pages', 'class': 'dropRightMenu'}).inject(Ngn.sd.ePanel, 'after');
      new Element('div', {
        'class': 'tit',
        id: 'pageTitle',
        html: '...'
      }).inject(ePages);
      new Element('div', {
        'class': 'tit',
        html: 'Разделы'
      }).inject(ePages);
      var fieldSet = new Ngn.sd.PagesSet(ePages, {
        fields: [
          { name: 'name' }
        ],
        data: data
      });
      new Ngn.Btn(Ngn.btn1('Сохранить', 'ok').inject(fieldSet.eContainer.getElement('.bbtns'), 'bottom'), function() {
        Ngn.loading(true);
        new Ngn.Request.JSON({
          url: '/pages/json_update',
          onComplete: function() {
            Ngn.loading(false);
          }
        }).post({data: Ngn.frm.toObj(fieldSet.eContainer)});
      });
      var hidebleBar = new Ngn.HidebleBar.V(ePages);
      hidebleBar.eHandlerShow.set('title', 'Показать');
      // Ngn.addTips(hidebleBar.eHandlerShow);
      // new Tips(hidebleBar.eHandlerShow)
      // c(Ngn.tips);
      // Ngn.tips.attache(hidebleBar.eHandlerShow);
      Ngn.sd.loadData(1);
    }
  }).send();
  new Element('a', { 'class': 'logo', href: 'http://sitedraw.ru', target: '_blank', title: 'Перейти на сайт sitedraw.ru' }).inject(Ngn.sd.ePanel);
  new Element('div', { 'class': 'tit', html: 'Блоки' }).inject(Ngn.sd.ePanel);
  Ngn.sd.buildBlockBtns(Ngn.sd.blockTypes, Ngn.sd.ePanel);

  new Element('div', { 'class': 'tit', html: 'Функции' }).inject(Ngn.sd.ePanel);
  new Ngn.Btn(Ngn.sd.fbtn('Вставить картинку', 'image'), null, {
    fileUpload: {
      url: '/pageBlock/json_createImage',
      onRequest: function() {
        Ngn.loading(true);
      }.bind(this),
      onComplete: function(v) {
        // v.html = v.html.replace(/src="([^"]+)"/g, 'src="$1?' + Math.random(1000) + '"');
        Ngn.sd.block(Ngn.sd.elBlock().inject(Ngn.sd.blockContainers[v.data.containerId].el), v);
        Ngn.loading(false);
      }.bind(this)
    }
  });
  /*
   new Ngn.Btn(Ngn.btn2('Загрузить шрифт', 'icon btn lrg list').inject(Ngn.sd.ePanel), null, {
   fileUpload: {
   url: '/pageBlock/json_createImage',
   onRequest: function() {
   Ngn.loading(true);
   }.bind(this),
   onComplete: function(v) {
   Ngn.sd.block(Ngn.sd.elBlock().inject(Ngn.sd.blockContainers[v.data.containerId].el), v);
   Ngn.loading(false);
   }.bind(this)
   }
   });
   */
  Ngn.sd.btnPreview = new Ngn.Btn(Ngn.sd.fbtn('Предпросмотр (Shift + P)', 'preview'), function() {
    Ngn.sd.previewSwitch();
  });
  Ngn.sd.btnSelect = new Ngn.Btn(Ngn.sd.fbtn('Выделить', 'select2'), function() {
  }, {
    usePushed: true
  });

  /*
  Ngn.sd.btnFullscreen = new Ngn.Btn(Ngn.sd.fbtn('Во весь экран (Shift + F)', 'select'), function() {
    var el = document.documentElement, rfs = el.requestFullScreen || el.webkitRequestFullScreen || el.mozRequestFullScreen;
    rfs.call(el);
  }, {
    usePushed: true
  });
  */

  Ngn.sd.exportRequest = function(pageName, onComplete) {
    new Ngn.Request.JSON({
      url: '/cpanel/json_export/' + pageName,
      onComplete: onComplete ? onComplete.pass(pageName) : function() {
      }
    }).post({
        html: Ngn.sd.exportLayout()
      });
  };
  new Ngn.Btn(Ngn.sd.fbtn('Экспорт', 'link'), function() {
    Ngn.sd.exportPageR(1);
  });
  new Element('div', {'class': 'clear'}).inject(Ngn.sd.ePanel);
  Ngn.sd.bindKeys();
};

Ngn.sd.fbtn = function(a, b) {
  var btn = Ngn.btn2(a, 'icon btn lrg ' + b);
  new Element('div', {'class': 'featureBtnWrapper'}).grab(btn).inject(Ngn.sd.ePanel);
  return btn;
};

Ngn.sd.movingBlock = {
  get: function() {
    return this.block;
  },
  set: function(block) {
    this.block = block;
    block.eDrag.addClass('pushed');
  },
  toggle: function(block) {
    if (this.block) {
      var enother = this.block != block;
      this.block.eDrag.removeClass('pushed');
      this.block = false;
      if (enother) this.set(block);
    } else {
      this.set(block);
    }
  },
  cancel: function() {
    if (!this.block) return;
    this.block.eDrag.removeClass('pushed');
    this.block = false;
  }
};

Ngn.sd.minContainerHeight = 100;

Ngn.sd.bindKeys = function() {
  var moveMap = {
    119: 'up',
    87: 'up',
    1094: 'up',
    1062: 'up',
    1092: 'left',
    1060: 'left',
    97: 'left',
    65: 'left',
    1099: 'down',
    1067: 'down',
    83: 'down',
    115: 'down',
    100: 'right',
    68: 'right',
    1074: 'right',
    1042: 'right'
  };
  var shiftMap = {
    'q': 'back',
    'Q': 'back',
    'й': 'back',
    'Й': 'back',
    'e': 'forward',
    'E': 'forward',
    'у': 'forward',
    'У': 'forward'
  };
  document.addEvent('keypress', function(e) {
    if (e.shift && (e.key == 'p' || e.key == 'з')) Ngn.sd.previewSwitch(); // p
    else if (moveMap[e.code]) {
      var movingBlock = Ngn.sd.movingBlock.get();
      if (movingBlock) movingBlock.move(moveMap[e.code]);
    } else if (shiftMap[e.key]) {
      var movingBlock = Ngn.sd.movingBlock.get();
      if (movingBlock) {
        (new Ngn.sd.PageBlocksShift)[shiftMap[e.key]](movingBlock._data.id);
      }
    }
  });
};

Ngn.sd.isPreview = function() {
  return $('layout').hasClass('preview');
};

Ngn.sd.previewSwitch = function(flag) {
  flag = typeof(flag) == 'undefined' ? Ngn.sd.isPreview() : !flag;
  if (flag) {
    $('layout').removeClass('preview');
    Ngn.sd.btnPreview.togglePushed(false);
  } else {
    $('layout').addClass('preview');
    Ngn.sd.btnPreview.togglePushed(true);
  }
};

Ngn.sd.updateLayoutContentHeight = function() {
  var y = 0;
  for (var i in Ngn.sd.blockContainers) y += Ngn.sd.blockContainers[i].el.getSize().y;
  $('layout').getElement('.lCont').sdSetStyle('min-height', (y + 6) + 'px');
};

Ngn.sd.SelectDialog = new Class({
  Extends: Ngn.Dialog,

  options: {
    // message: html,
    // title: '123'
    dialogClass: 'dialog selectDialog',
    selectedName: false,
    footer: false,
    width: 580,
    height: 300,
    savePosition: true,
    onChangeFont: $empty()
  },
  setOptions: function(opts) {
    this.parent($merge(opts || {}, {id: this.name + 'Select'}));
  },
  init: function() {
    var eSelected;
    var obj = this;
    this.message.getElements('div.item').each(function(el) {
      if (obj.options.selectedName && el.get('data-name') == obj.options.selectedName) {
        eSelected = el.addClass('selected');
      }
      el.addEvent('click', function() {
        if (eSelected) eSelected.removeClass('selected');
        el.addClass('selected');
        eSelected = this;
        obj.fireEvent('changeValue', el.get('data-name'));
      });
    });
    if (eSelected) (function() {
      new Fx.Scroll(obj.message).toElement(eSelected)
    }).delay(500);
  }

});

Ngn.sd.FontSelectDialog = new Class({
  Extends: Ngn.sd.SelectDialog,

  name: 'font',

  options: {
    message: Ngn.tpls.fontSelect,
    title: 'Выбор шрифта'
  },
  init: function() {
    this.parent();
    this.message.addClass('hLoader');
    var els = this.message.getElements('div.item');
    var loaded = 0;
    els.each(function(el) {
      Ngn.sd.loadFont(el.get('data-name'), function() {
        loaded++;
        Cufon.set('fontFamily', el.get('data-name')).replace(el.getElement('.font'));
        if (loaded == els.length) this.message.removeClass('hLoader');
      }.bind(this));
    }.bind(this));
  }

});

Ngn.Form.El.DialogSelect.Sd = new Class({
  Extends: Ngn.Form.El.DialogSelect,

  getSelectDialogEl: function() {
    var eSelectDialog = new Element('div', {
      'class': 'dialogSelect' + (this.options.selectClass ? ' ' + this.options.selectClass : ''),
      title: this.options.selectTitle
    }).inject(this.eInitField, 'after');
    new Element('div', {'class': 'rightFading'}).inject(eSelectDialog);
    return eSelectDialog;
  }

});

Ngn.Form.El.FontFamilyCufon = new Class({
  Extends: Ngn.Form.El.DialogSelect.Sd,

  baseName: 'font',

  options: {
    selectClass: 'font'
  },

  init: function() {
    this.parent();
    this.value ? Ngn.sd.loadFont(this.value, this.initControl.bind(this)) : this.initControl();
  },
  initControlDefault: function() {
  },
  setValue: function(font) {
    this.parent(font);
    Cufon.set('fontFamily', font).replace(this.eSelectDialog);
  },
  getDialogClass: function() {
    return Ngn.sd.FontSelectDialog;
  }

});

Ngn.sd.itemTpl = function(k, v) {
  return Elements.from(Ngn.tpls[k])[0].getElement('div.item[data-name=' + v + ']').get('html')
};

Ngn.Form.El.SvgSelect = new Class({
  Extends: Ngn.Form.El.DialogSelect.Sd,

  baseName: 'svg',

  getDialogClass: function() {
    return Ngn.sd.SvgSelectDialog;
  },

  setValue: function(value) {
    this.parent(value);
    this.eSelectDialog.set('html', Ngn.sd.itemTpl('svgSelect', value));
  }

});

Ngn.sd.SvgSelectDialog = new Class({
  Extends: Ngn.sd.SelectDialog,
  name: 'svg',
  options: {
    message: Ngn.tpls.svgSelect,
    title: 'Выбор векторной картинки'
  }
});

Ngn.sd.init = function() {
  Ngn.sd.buildPanel();

  Ngn.sd.exportPageR = function(n) {
    c('Загружаю данные');
    var onLoaded = function(n) {
      if (Ngn.sd.pages[n + 1]) {
        var onComplete = function() {
          Ngn.sd.exportPageR(n + 1);
        }
      } else {
        var onComplete = function() {
          new Ngn.Dialog.Link({ link: '/index.html' });
        }
      }
      c('Экспортирую ' + (n == 1 ? 'индекс' : n));
      Ngn.sd.exportRequest(n == 1 ? 'index' : 'page' + n, onComplete);
    };
    Ngn.sd.loadData(n, onLoaded);
  };

};

Ngn.sd.updateContainerHeight = function(eContainer) {
  Ngn.sd.setMinHeight(eContainer, 0, Ngn.sd.minContainerHeight);
  Ngn.sd.updateLayoutContentHeight();
};

Ngn.sd.initFullBodyHeight();