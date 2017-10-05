const createStore = (reducer, initialState) => {
  let currentState = initialState;
  const listeners = [];

  const getState = () => currentState;
  const dispatch = action => {
    currentState = reducer(currentState, action);
    listeners.forEach(listener => listener());
  };

  const subscribe = listener => {
    let isSubscribed = true;
    listeners.push(listener);

    //нужно иметь возможность отписать слушателя, когда будет необходимость, например когда будет отмонтирован компонент
    return function unsubscribe() {
      if (!isSubscribed) {
        // если уже отписались, то ничего не делаем
        return;
      }

      isSubscribed = false;

      const index = listeners.indexOf(listener);
      listeners.splice(index, 1);
    };
  };

  return { getState, dispatch, subscribe };
};

const connect = (mapStateToProps, mapDispatchToProps) => Component => {
  return class extends React.Component {
    // нужно, чтобы store появился в this.context
    static contextTypes = {
      store: React.PropTypes.object
    };

    render() {
      return (
        <Component
          {...mapStateToProps(this.context.store.getState(), this.props)}
          {...mapDispatchToProps(this.context.store.dispatch, this.props)}
        />
      );
    }

    componentDidMount() {
      this.unsubscribe = this.context.store.subscribe(this.handleChange);
    }

    componentWillUnmount() {
      // компонента не стало, нужно убрать listener из списка
      this.unsubscribe();
    }

    handleChange = () => {
      this.forceUpdate();
    };
  };
};

class Provider extends React.Component {
  // глобальный store нельзя использовать, так как store может быть несколько,
  // да и глобальные переменные следует использовать только в крайнем случае
  // поэтому воспользуемся контекстом реакта, чтобы передать store всем дочерним компонентам Provider'а

  static childContextTypes = {
    store: React.PropTypes.object
  };

  getChildContext() {
    return { store: this.props.store };
  }

  render() {
    return this.props.children;
  }
}

// APP

// actions
const ADD_TODO = 'ADD_TODO';

// action creators
const addTodo = todo => ({
  type: ADD_TODO,
  payload: todo
});

// reducers
const reducer = (state = [], action) => {
  switch (action.type) {
    case ADD_TODO:
      // нельзя модифицировать предыдущий объект состояния
      // вместо этого создаем его копию и добавляем новую запись.
      // если объект состояния является сложным и может быть не плоским
      // то делать глубокое копирование всех его свойств необязательно
      // достаточно скопировать те части которые не изменились и склонировать измененые
      // https://twitter.com/dan_abramov/status/688087202312491008?lang=en
      // также можно использовать библиотеки immutable.js, seamless-immutable, Ramda и пр.
      // которые позволяют облегчить работу с неизменяемымми струтурами данных и избежать ошибок
      return [...state, action.payload];
    default:
      return state;
  }
};

// components
// Компоненты не зависят от состояния, их проще переиспользовать и тестировать

const TodoInput = ({ todoText, placeholder, handleChange, handleAddTodo, addText }) => (
  <div>
    <input value={todoText} placeholder={placeholder} onChange={handleChange} />
    <button onClick={handleAddTodo}>{addText}</button>
  </div>
);
const Todo = ({ todo }) => <li>{todo}</li>;
// в TodoList в цикле создаются компоненты Todo. react требует, чтобы для них было проставлен атрибут key
// который позволяет ему однозначно идентифицировать компонент.
// в данном примере каждый todo не имеет своего id, является статическим, не вычисляется и не изменяется
// последовательность todo в списке не меняется
// поэтому в данном случае можно использовать для key индекс idx
// в противном случае для элемента списка нужно заводить уникальное поле id и использовать его вместо idx
const TodoList = ({ todos }) => <ul>{todos.map((todo, idx) => <Todo key={idx} todo={todo} />)}</ul>;
const TodoComponentTitle = ({ title = 'Без названия' }) => <label>{title}</label>;

// containers
// Контейнеры зависят от состояния

// изменение todoText (без нажатия на кнопку Добавить) не будет вызывать render всего ToDoComponent,
// состояние TodoInputContainer можно вынести в отдельный редьюсер или расширить текущий,
// но для хранения внутреннего состояния, которое в другом месте нигде не используется, можно использовать react state
class TodoInputContainer extends React.Component {
  state = {
    todoText: ''
  };

  updateText = e => {
    const { value: todoText } = e.target;

    this.setState({ ...this.state, todoText });
  };

  handleAddTodo = () => {
    this.props.handleAddTodo(this.state.todoText);
    this.setState({ ...this.state, todoText: '' });
  };

  render() {
    const { handleAddTodo } = this.props;
    return (
      <TodoInput
        todoText={this.state.todoText}
        placeholder="Название задачи"
        handleChange={this.updateText}
        handleAddTodo={this.handleAddTodo}
        addText="Добавить"
      />
    );
  }
}

// после разбиения на компоненты основной компонент приобрел компактный вид, стали понятны его основные части
// если каждый компонент или контенейр положить в отдельный файл, то при совместной разрботке возможно будет меньшее количество конфликтов
// в системе контроля версий
const ToDoComponent = ({ title, todos, addTodo }) => (
  <div>
    <TodoComponentTitle title={title} />
    <div>
      <TodoInputContainer handleAddTodo={addTodo} />
      <TodoList todos={todos} />
    </div>
  </div>
);

// из ownProps нужно достать переданнный в ToDo title
const ToDo = connect(
  (state, ownProps) => ({
    todos: state,
    title: ownProps.title
  }),
  dispatch => ({
    addTodo: text => dispatch(addTodo(text))
  })
)(ToDoComponent);

// init
ReactDOM.render(
  <Provider store={createStore(reducer, [])}>
    <ToDo title="Список задач" />
  </Provider>,
  document.getElementById('app')
);
