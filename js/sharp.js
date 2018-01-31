(function() {
  //helper functions---------------------------------------------------------------------------------------//
  Array.prototype.SharpDiff = function(a) {
    return {
      "rm": this.filter(i => a.indexOf(i) < 0),
      "add": a.filter(i => this.indexOf(i) < 0)
    }
  }

  Array.prototype.SharpParser = function() {
    return this.map(classParser)
  }

  String.prototype.SharpFilter = function() {
    return this.split(" ").filter(_ => _.indexOf(':') != -1)
  }

  let classParser = (clazz) => {
    let sa = clazz.split(':')
    return {
      state: sa[0],
      action: sa[1]
    }
  }

  let initElement = (target) => {
    if (target instanceof HTMLElement)
      target.className.SharpFilter()
        .SharpParser()
        .forEach(sa => sharp.actions.addAction(target, sa))
  }

  //body observer---------------------------------------------------------------------------------------//
  let observerConfig = {
    childList: true,
    attributes: true, 
    attributeFilter: ['class'],
    attributeOldValue: true,
    subtree: true
  }

  let observer = new MutationObserver(mutations => {
    mutations.forEach(mut => {
      if (mut.type == "childList") {
        //initialize sharp on element creation...
        mut.addedNodes.forEach(node => initElement(node))
      } else {
        // calculate the difference between class values...
        let diff = mut.oldValue.SharpFilter().SharpDiff(mut.target.className.SharpFilter())

        //add action on class add...
        diff['add']
          .SharpParser()
          .forEach(sa => sharp.actions.addAction(mut.target, sa))

        //remove action on class remove...
        diff['rm']
          .SharpParser()
          .forEach(sa => sharp.actions.removeAction(mut.target, sa))
      }
    })
  })

  //sharp classes---------------------------------------------------------------------------------------//
  class SharpActions {
    constructor() {
      this.actions = {}
    }

    install(action, actFunc) {
      console.log(`  Action: ${action}`)
      this.actions[action] = actFunc
      return this
    }

    addAction(el, sa) {
      let events = sharp.config.stateEvents[sa.state]
      let actFunc = this.actions[sa.action]
      if (events && actFunc) {
        if (!el.sharp) el.sharp = {}

        el.sharp[sa.action] = (evt) => {
          let reaction = sharp.config.eventReactions[evt.type]
          if (reaction) {
            console.log(`REACT -> ${sa.state}:${evt.type}`)
            //TODO: apply reactions...
          }

          console.log(`ACT -> ${sa.state}:${sa.action}`)
          let sharpEl = new SharpElements(evt.target)
          actFunc(sharpEl, sa.state, evt)
        }

        console.log(`ADD-ACTION: (id=${el.id}, state=${sa.state}, action=${sa.action})`)
        if (events instanceof Array)
          events.forEach(event => el.addEventListener(event, el.sharp[sa.action]))
        else
          el.addEventListener(events, el.sharp[sa.action])
      }

      return this
    }

    removeAction(el, sa) {
      let events = sharp.config.stateEvents[sa.state]
      let actFunc = this.actions[sa.action]
      if (events && actFunc) {
        if (events instanceof Array)
          events.forEach(event => el.removeEventListener(event, el.sharp[sa.action]))
        else
          el.removeEventListener(events, el.sharp[sa.action])
        
        delete el.sharp[sa.action]
        console.log(`RM-ACTION: (id=${el.id}, state=${sa.state}, action=${sa.action})`)
      }

      return this
    }
  }

  //let parser = new DOMParser()

  class SharpElements {
    constructor(els) {
      if (els instanceof NodeList)
        this.els = els
      else if (els instanceof HTMLElement)
        this.els = [els]
    }

    // list all elements available actions
    actions() {
      if (this.els.length === 1)
        return Object.keys(this.els[0].sharp)
      
      let _actions = []
      this.els.forEach(el => _actions.push.apply(_actions, Object.keys(el.sharp)))
      return _actions
    }

    init() {
      this.els.forEach(el => initElement(el))
      return this
    }

    append(html) {
      this.els.forEach(el => {
        //FIX: Modifying innerHTML will destroy and rebuild all descendant elements of the container.
        el.innerHTML += html
      })
      return this
    }

    addClass(clazz) {
      this.els.forEach(el => el.classList.add(clazz))
      return this
    }

    removeClass(clazz) {
      this.els.forEach(el => el.classList.remove(clazz))
      return this
    }
  }

  //sharp config and load---------------------------------------------------------------------------------------//
  let readyFuncs = []

  sharp = function(sel) {
    let res = document.querySelectorAll(sel)
    return new SharpElements(res)
  }

  sharp.config = {
    stateEvents: { click: 'click', hover: ['mouseenter', 'mouseleave'], focus: 'focus' }, //filled
    eventReactions: { mouseenter: 'add-class', mouseleave: 'remove-class' }
  }

  sharp.actions = new SharpActions()

  sharp.ready = function(func) {
    readyFuncs.push(func)
  }

  function load() {
    console.log("---sharp-css---")
    observer.observe(document.documentElement, observerConfig)
    
    console.log("Install Actions: ")
    readyFuncs.forEach(func => func())

    console.log("---sharp-init---")
    sharp('[class*=":"]').init()
  }

  document.addEventListener('DOMContentLoaded', load, false)
})()