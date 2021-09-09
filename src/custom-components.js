module.exports = {
	//提供的component组件，可以转为任何自定义组件
	component:{
		props:['name','props'],
		render:function(props){
			const cmp = state.component(props.name)
			if(!cmp){
				throw new Error('The component "'+ props.name +'" is not registered')
			}
			return cmp.render(props.props)
		}
	}
}