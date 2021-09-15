#### Refex是一个基于Proxy实现的轻量级MVVM框架

##### 基本使用

```
<!-- 使用双大括号进行数据渲染，可以应用在属性名、属性值和标签内容上 -->
<div id="app">
    <div>{{name}}</div>
    div>{{frames}}</div>
</div>
```

```
//引入Refex提供的方法，创建包含响应式数据对象的整个应用实例
const { proxy, useProxy, h } = Refex
const app = proxy({
    show:false,
    name:'refex',
    frames:['mvi-web','element-ui','iView','BootStrap'],
    obj:{
        name:'vue',
        verison:3,
        type:'JavaScript'
    }
})
```

```
//获取可操作的响应式数据对象，通过该对象可直接操作数据
const snap = useProxy(app)
snap.name = 'refex是一款MVVM框架'
```

##### 动态class

```
//class不同于其他的属性，支持动态绑定的值为对象和数组
<div class="{{ {a:true,b:true} }}"></div>
<div class="{{ ['a','b'] }}"></div>
```

##### 数据监听

```
//通过watch方法实现数据监听
app.watch('name',function(newValue,oldValue){
    //监听name值变化，回调参数为改变后的新值和改变前的旧值
    //在该方法内，this指向snap对象
})
```

```
//通过unwatch方法解除数据的监听
app.unwatch('name')
```

##### 循环渲染

```
<!-- refex内部提供了@for指令，用于实现数组/对象数据的渲染 -->
<ul>
    <li @for="item in frames">{{item}}</li>
</ul>
```

```
<!-- 获取item和index -->
<ul>
    <li @for="(item,index) in frames" data-index="{{index}}">{{item}}</li>
</ul>
```

```
<!-- 遍历对象 -->
<ul>
    <li @for="(item,key,index) in obj" data-index="{{index}}">{{item}}：{{key}}</li>
</ul>
```

##### 条件渲染

```
<!-- 通过@if指令来控制元素是否渲染 -->
<div @if="show"></div>
```

```
<!-- 可以使用@else-if/@else与@if搭配使用 -->
<div @if="name=='refex'"></div>
<div @else-if="name=='vue'"></div>
<div @else></div>
```

##### 事件绑定

```
<!-- 通过#前缀来给元素绑定事件 -->
<button #click="myEvent">Button</button>
```
> 事件的绑定值是响应式数据，且该数据为函数，如下：

```
const app = proxy({
    myEvent:function(e){
        //函数内this指向snap对象
        //第一个参数e永远是event对象，自带参数在后面
    }
})
```

```
<!-- 带参数的事件 -->
<button #click="myEvent(12,3)">Button</button>
```

```
<!-- 也可以直接绑定表达式，但只支持snap的数据 -->
<button #click="show=!show">Button</button>
```

```
<!-- 不支持for循环的数据 -->
<ul>
    <li @for="item in frames" #click="item='a'"></li>
    <!-- 这里会报错item is undefined -->
</ul>
```

##### 事件修饰符

> 事件的修饰符通过.来表示，可以多个一起使用

```
<!-- stop修饰符：阻止事件向上传播 -->
<button #click.stop="change">Button</button>
```

```
<!-- prevent修饰符：禁止浏览器默认行为 -->
<button #click.prevent="change">Button</button>
```

```
<!-- self修饰符：只在事件本身节点触发，即针对子元素不生效 -->
<button #click.self="change">Button</button>
```

```
<!-- once修饰符：事件只执行一次，随后解除事件的绑定 -->
<button #click.once="change">Button</button>
```

```
<!-- passive修饰符：不阻止事件的默认行为 -->
<button #click.passive="change">Button</button>
```

```
<!-- capture修饰符：添加事件监听器时使用事件捕获模式 -->
<button #click.capture="change">Button</button>
```

```
<!-- 多个修饰符一起使用 -->
<button #click.stop.prevent="change">Button</button>
```

##### show指令

```
<!-- @show只是单纯的控制display为none来隐藏元素 -->
<div @show="show"></div>
```

##### 自定义指令


```
<!-- 指令通过@前缀使用 -->
<input type="text" @focus="value" />
<!-- 如果指令不需要指定响应式数据，可以直接省略表达式 -->
<input type="text" @focus />
```

```
//通过directive方法来自定义一个指令
app.directive('focus',{
    mounted:function(el,value,modifier,exp,vnode){
        el.focus()
    }
})
```
> directive方法第一个参数为指令名称，第二个参数是对象，表示指令的几个钩子函数，每个钩子函数中的this都指向snap对象，具体如下：

```
{
    beforeMount:function(value,modifier,exp,vnode){
        //这里this指向snap对象
        //指令所在元素渲染之前触发
    },
    mounted:function(el,value,modifier,exp,vnode){
        //这里this指向snap对象
        //指令所在元素渲染之后触发
    },
    beforeUpdate:function(el,value,modifier,exp,vnode){
        //这里this指向snap对象
        //指令所在元素更新之前触发
    },
    updated:function(el,value,modifier,exp,vnode){
        //这里this指向snap对象
        //指令所在元素更新后触发
    },
    beforeUnmount:function(el,value,modifier,exp,vnode){
        //这里this指向snap对象
        //指令所在元素移除之前触发
    },
    unmounted:function(value,modifier,exp,vnode){
        //这里this指向snap对象
        //指令所在元素移除后触发
    }
}
```
> 回调参数el表示指令所在元素，value表示指令表达式的值，modifier表示指令修饰符，exp表示指令表达式字符串，vnode表示指令所在虚拟节点

```
<!--修饰符的表现形式为.加上修饰符名称-->
<input @focus.a />
<!--这里a字符串即修饰符-->
```

```
//获取指令，通常用来判断指令是否存在
const d = app.directive('focus')
if(d){
    //存在@focus指令
}
```


##### 自定义组件


```
<!--html中直接通过组件名称来使用，由于HTML限制，组件名称不支持大写，请使用小写字母-->
<my-component key="{{name}}" id="el"></my-component>
```

```
//通过component方法来注册一个组件
app.component('my-component',{
    props:['key'],
    render:function(props){
        //这里this指向snap对象
        //props的值为{key:'refex'}
        //这里key属性不会直接渲染到div上，而id="el"会渲染到div上
        return '<div>这是我的自定义组件</div>'
    }
})
```
> component方法的第一个参数表示组件名称，第二个参数表示组件参数，组件参数主要包含props和render，其中props是一个属性名称数组，表示在应用该组件时，直接写在组件上的属性是否作为render函数回调参数来使用，而不是直接渲染到实际元素上。第二个参数表示渲染函数，支持模板渲染和函数渲染，具体如下：



```
//模板渲染
render:function(props){
    return `<div>自定义组件</div>`
}
//模板渲染就等同于在HTML中的用法，比如
render:function(props){
    return `<div #click="myEvents">{{name}}</div>`
}
```

```
//函数渲染
render:function(props){
    return h('div',{
        attrs:{
            id:'el'
        },
        classes:{
            'my-component':true
        }
    })
}
```

```
//函数渲染方式必须通过返回h函数的执行结果
//h函数的第一个参数表示创建的节点名称
//h函数的第二个参数是一个对象，包含以下属性
{
    attrs:节点属性，如{id:'el',style:'display:block;'}
    classes:节点的class，支持数组、对象和字符串，如['btn','btn-primary']或者{'btn':true,'btn-primary':true}或者'btn btn-primary'
    directives:节点上应用的指令，是一个对象，对象的每个键名表示指令名称，键值表示指令参数（指令参数包含value和modifier两个值），如{ focus:{ value:2,modifier:'value' } }
    events:节点的事件集合，是一个对象，对象的每个键表示事件名称，键值表示事件处理函数，如{ click:function(){} }
    text:节点文本值，如果该值存在，则slots参数失效
    slots:节点子元素，数组类型，里面每个元素都是h函数执行结果
    if:该节点是否渲染，布尔类型
}
```
> 获取组件仍然使用component方法，如下：

```
const cmp = app.component('my-component')
if(cmp){
    //组件存在
}
```
> h函数中的slots参数可以使用获取到的组件来作为子元素

```
const cmp = app.componet('my-component')
app.component('my-component-container',{
    props:[],
    render:function(props){
        return h('div',{
            slots:[
                //通过render函数来渲染该组件，作为my-component-container组件的子组件，可以把props作为参数传递进去
                cmp.render(props),
                cmp.render(props),
                cmp.render(props)
            ]
        })
    }
})
```


##### 内置component组件

> refex内置了一个名为component的组件，可以通过name的取值来转换成任意已经定义的组件
```
<component name="my-component"></component>
```

> 组件的props属性是一个对象，会作为render函数参数传递给具体实现的组件，如下：
```
<component name="my-component" props="{{props}}"></component>

const state = proxy({
    props:{
        primary:false
    }
})

//以上component组件会转换为
<my-component primary="{{false}}"></my-component>
```


##### 内置slot组件
> refex内置的slot组件用于展示组件原本内容
```
<my-component>222</my-component>
```
```
app.component('my-component',{
    render:function(props){
        return '<div class="demo"><slot></slot></div>'
    }
})
```

最终会渲染成如下：
```
<div class="demo">222</div>
```

> slot组件不能直接用于render函数的返回值
```
//如下会报错
app.component('my-component',{
    render:function(props){
        return '<slot></slot>'
    }
})
```

> slot组件也不能直接写在自定义组件之外，比如直接写在页面上
```
//html页面上直接写，会导致报错
<slot></slot>
```

### 详情请参阅[refex文档](https://www.mvi-web.cn/library/30)