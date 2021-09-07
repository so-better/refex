module.exports = {
	//定义show指令
	show: {
		mounted: function(el, value) {
			if (!value) {
				el.style.display = 'none'
			}
		},
		updated: function(el, value) {
			if (value) {
				el.style.display = ''
			} else {
				el.style.display = 'none'
			}
		}
	}
}
