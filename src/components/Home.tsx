import { Col, Container, Form, FormControl, Row, ListGroup, Button } from 'react-bootstrap'
import { useEffect, useState, FormEvent } from 'react'
import { io } from 'socket.io-client'
import User from '../types/User'
import Message from '../types/Message'
import { Room } from '../types/Room'

// 1) I'M REFRESHING THE BROWSER, THE SOCKET.IO CONNECTION GETS ESTABLISHED
// 2) THE BACKEND GREETS ME AND SENDS ME A CONNECT EVENT
// 3) NOW THE CLIENT IS ABLE TO SEND A USERNAME
// 4) IF THE BACKEND LISTENS CORRECTLY FOR MY USERNAME AND ACCEPTS IT,
// IT WILL SEND BACK TO THE CLIENT A 'LOGGEDIN' EVENT, WHICH THE CLIENT CAN LISTEN TO
// 5) SO I CAN TOGGLE THE USERNAME AND THE MESSAGE DISABLED PROPERTIES
// 6) ALL THE OTHER CLIENT CONNECTED RECEIVES INSTEAD A NEWCONNECTION EVENT!
// 7) THE JUST CONNECTED CLIENT AND ALL THE OTHER CLIENTS RECEIVING A NEWCONNECTION EVENT
// CAN FETCH THE LIST OF ONLINE USERS WITH /online-users

const ADDRESS = 'http://localhost:3030'
const socket = io(ADDRESS, { transports: ['websocket'] })
// this is the socket initialization
// socket -> it's our connection to the server

const Home = () => {
  const [username, setUsername] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<User[]>([])
  const [message, setMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<Message[]>([])

  useEffect(() => {
    // we're now going to set up some event listeners, just once
    // for the entire lifetime of this chat application

    // the first one will be for acknowledging the successfull connection with the backend
    socket.on('connect', () => {
      // with on we're listening for an event
      console.log('Connection established!')
      console.log(socket.id)
      // now you can send the username for loggin in!
    })

    socket.on('loggedin', () => {
      console.log("Now I'm logged in!")
      // storing this info locally to disable the username input and enabling the message field
      setLoggedIn(!loggedIn)
      // I will now fetch the list of online users
      fetchOnlineUsers()
    })

    socket.on('newConnection', () => {
      console.log('Look! Someone else connected to the chat!')
      console.log("Probably it's time to fetch the list of online users again!")
      fetchOnlineUsers()
    })

    socket.on('message', (newMessageJustReceived) => {
      //   console.log("message received! let's post it in the window...")
      //   console.log(newMessageJustReceived)
      // this is happening on ALL clients apart from the one who sent the message!

      console.log('OLD CHATHISTORY', chatHistory)

      // BROKEN! the value of chatHistory is just taken initialle and never re-evaluated!
      //   let newChatHistory = chatHistory.concat(newMessageJustReceived)
      //   setChatHistory(newChatHistory)

      // instead with this callback we're getting the most up-to-date value of chatHistory
      // from the hook callback (it's re-evaluated every time!)
      setChatHistory((chatHistory: Message[]) => {
        console.log(chatHistory)
        return [...chatHistory, newMessageJustReceived]
      })
    })
  }, [])

  const handleUsernameSubmit = (e: FormEvent) => {
    e.preventDefault()
    socket.emit('setUsername', { username, room })
    getChatHistory()
  }

  const getChatHistory = async () => {
    const response = await fetch(`http://localhost:3030/rooms/${room}`)
    const history = await response.json()

    setChatHistory(history)
  }

  const fetchOnlineUsers = async () => {
    try {
      let response = await fetch(ADDRESS + '/online-users')
      if (response.ok) {
        let { onlineUsers }: { onlineUsers: User[] } = await response.json()
        setOnlineUsers(onlineUsers)
      } else {
        console.log('error fetching the users!')
      }
    } catch (error) {
      console.log(error)
    }
  }

  const sendMessage = (e: FormEvent) => {
    e.preventDefault()

    const newMessage: Message = {
      text: message,
      id: socket.id,
      sender: username,
      timestamp: Date.now(),
    }

    socket.emit('sendmessage', { message: newMessage, room })

    setChatHistory([...chatHistory, newMessage])
    setMessage('')
  }

  const [room, setRoom] = useState<Room>("blue")

  const toggleRoom = () => {
    setRoom(r => r === "blue" ? "red" : "blue")
  }

  return (
    <Container fluid className="px-4">
      <Row className="my-3" style={{ height: '95vh' }}>
        <Col md={10} className="d-flex flex-column justify-content-between">
          {/* MAIN MESSAGES AREA */}
          {/* TOP SECTION: SUBMIT THE USERNAME */}
          <Form onSubmit={handleUsernameSubmit} className="d-flex">
            <FormControl
              placeholder="Insert your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loggedIn}
            />
            <Button
              variant={room === "blue" ? "primary" : "danger"}
              className="ml-3"
              onClick={toggleRoom}
              disabled={loggedIn}
            >Room</Button>
          </Form>
          {/* MIDDLE SECTION: ALL THE MESSAGES */}
          <ListGroup>
            {chatHistory.map((message, i) => (
              <ListGroup.Item key={i}>
                <strong>{message.sender}</strong>
                <span className="mx-1"> | </span>
                <span>{message.text}</span>
                <span className="ml-2" style={{ fontSize: '0.7rem' }}>
                  {new Date(message.timestamp).toLocaleTimeString('en-US')}
                </span>
              </ListGroup.Item>
            ))}
          </ListGroup>
          {/* BOTTOM SECTION: NEW MESSAGES SENDING */}
          <Form onSubmit={sendMessage}>
            <FormControl
              placeholder="Write your message here..."
              disabled={!loggedIn}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </Form>
        </Col>
        <Col md={2} style={{ borderLeft: '2px solid black' }}>
          {/* CONNECTED USERS SECTION */}
          <div className="mb-3">Connected users:</div>
          <ListGroup>
            {onlineUsers.length === 0 && <div>No users yet!</div>}
            {onlineUsers
              .filter(user => user.room === room)
              .map((user, i) => (
                <ListGroup.Item key={i}>{user.username}</ListGroup.Item>
              ))}
          </ListGroup>
        </Col>
      </Row>
    </Container>
  )
}

export default Home
