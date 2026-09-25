package models

import (
"time"
)

type MongoPosition struct {
ID        interface{} `bson:"_id" json:"_id"`
Name      string      `bson:"name" json:"name"`
Label     string      `bson:"label" json:"label"`
CreatedAt time.Time   `bson:"createdAt,omitempty" json:"createdAt,omitempty"`
UpdatedAt time.Time   `bson:"updatedAt,omitempty" json:"updatedAt,omitempty"`
}
