function Node(data) {
	this.data = data;

	this.next = null;
	this.prev = null;
}

function LinkedList() {
	this._length = 0;
	this.head = null;
	this.tail = null;
}

LinkedList.prototype.prepend = function (value) {
	let node = new Node(value);
	let curr = this.head;

	this.head = node;
	++this._length;
	this.head.next = curr;
	this.head.prev = null;
	
	if (curr) curr.prev = node;
	if (this._length === 1) this.tail = node;
	
	return node;
};

LinkedList.prototype.append = function (value) {
	let node = new Node(value);

	if (this._length === 0)
		return this.prepend(value);
	
	++this._length;

	this.tail.next = node;
	node.prev = this.tail;
	this.tail = node;

	return node;
};

LinkedList.prototype[Symbol.iterator] = function*() {
	let curr = this.head;
	while (curr) {
		yield curr.data;
		curr = curr.next;
	}
};

LinkedList.prototype.get = function (index) {
	if (index < 0) return null;
	
	let curr = 0;
	let node = this.head;

	while (curr != index) {
		if (!node) return null;
		
		node = node.next;
		++curr;
	}
	
	return node;
};

LinkedList.prototype.insert = function (index, value) {
	if (index < 0) return;
	
	let curr = 0;
	let node = this.head;
	let last = null;
	
	while (curr != index && node) {
		last = node;
		node = node.next;
		++curr;
	}
	
	let ins = new Node(value);
	++this._length;
	
	ins.next = node;
	ins.prev = null;
	
	if (node) {
		// Insert before
		if (curr === index) {
			ins.prev = node.prev;
			node.prev = ins;
		
			if (ins.prev) ins.prev.next = ins;
		} else {
			ins.prev = last;
			last.next = ins;
			if (this.tail === last) this.tail = ins;
		}
	}
	
	if (curr === 0) this.head = ins;
	if (this._length === 1) this.tail = ins;

	return ins;
}

LinkedList.prototype.remove = function (index) {
	if (index < 0) return null;
	
	let curr = 0;
	let node = this.head;
	
	while (curr != index) {
		if (!node) return null;
		
		node = node.next;
		++curr;
	}
	
	--this._length;
	if (node.prev) node.prev.next = node.next;
	if (node.next) node.next.prev = node.prev;
	
	if (curr === 0) this.head = node.next;
	if (this.tail === node) this.tail = node.prev;
	
	return node;
};

LinkedList.prototype.clear = function () {
	this.head = null;
	this._length = 0;
};

LinkedList.prototype.flatten = function() {
	let result = [];
	for (let item of this) result.push(item);

	return result;
}