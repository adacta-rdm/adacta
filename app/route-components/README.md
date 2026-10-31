# Route components

This directory contains UI extracted from route files to give the route more
room. These components may use React Router hooks and the types of their owning
route. They do not access databases, service containers, requests, or server
contexts.

`useUrlState` keeps state that only changes what a page shows in the query of
the address, for example a selection. A test makes sure that no other code
changes the query with the setter of `useSearchParams`.
