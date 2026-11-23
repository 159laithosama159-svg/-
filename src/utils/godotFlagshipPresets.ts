import {
  normalizeGodotProjectPayload,
  type GodotProjectBundle,
} from './godotEngineUtils';

/**
 * Complete, 100% runnable Godot 4.3+ 3D Open-World Game combining:
 * - Roblox blocky customizable character + obby jump pads + sandbox freedom
 * - GTA 6 Vice-City neon boulevard, drivable sports cars (press E to enter/exit),
 *   palm beach, skyscrapers, missions, cash economy, wanted-level stars, and live HUD!
 *
 * Includes BOTH real Godot 4.3+ GDScript 2.0 files (.godot, .tscn, .gd) ready for F5
 * AND a rich, immediately playable browser sandbox preview!
 */
export function buildRobloxGta6GodotProject(options?: {
  bridgeWsUrl?: string;
  pairCode?: string;
}): { project: GodotProjectBundle; guideMarkdown: string } {
  const mainTscn = `[gd_scene load_steps=3 format=3]

[ext_resource type="Script" path="res://scripts/main.gd" id="1_main"]
[ext_resource type="Script" path="res://scripts/city_builder.gd" id="2_city"]

[node name="ValdrionCity6" type="Node3D"]
script = ExtResource("1_main")

[node name="CityBuilder" type="Node3D" parent="."]
script = ExtResource("2_city")

[node name="SunLight" type="DirectionalLight3D" parent="."]
transform = Transform3D(0.866, -0.353, 0.353, 0, 0.707, 0.707, -0.5, -0.612, 0.612, 0, 45, 0)
light_color = Color(1, 0.88, 0.72, 1)
light_energy = 1.45
shadow_enabled = true

[node name="HUD" type="CanvasLayer" parent="."]

[node name="TopPanel" type="PanelContainer" parent="HUD"]
offset_left = 18.0
offset_top = 18.0
offset_right = 460.0
offset_bottom = 128.0

[node name="VBox" type="VBoxContainer" parent="HUD/TopPanel"]
layout_mode = 2

[node name="TitleLabel" type="Label" parent="HUD/TopPanel/VBox"]
layout_mode = 2
text = "VALDRION CITY 6 — Roblox x GTA Open World (Godot 4.3)"

[node name="StatsLabel" type="Label" parent="HUD/TopPanel/VBox"]
layout_mode = 2
text = "$0  |  Wanted: ☆☆☆☆☆  |  Mode: On Foot"

[node name="MissionLabel" type="Label" parent="HUD/TopPanel/VBox"]
layout_mode = 2
text = "Mission: Drive through the golden Vice Boulevard checkpoints!"

[node name="HintLabel" type="Label" parent="HUD"]
offset_left = 18.0
offset_top = 668.0
offset_right = 820.0
offset_bottom = 702.0
text = "WASD: Move/Drive | Space: Jump/Brake | Shift: Sprint/Nitro | E: Enter/Exit Car | C: Change Roblox Outfit | R: Respawn"
`;

  const mainGd = `extends Node3D
## VALDRION CITY 6 — Main World Orchestrator (Roblox x GTA 6 Sandbox for Godot 4.3+)

const PlayerScript = preload("res://scripts/player.gd")
const VehicleScript = preload("res://scripts/vehicle.gd")
const TrafficScript = preload("res://scripts/npc_traffic.gd")

@onready var city_builder: Node3D = $CityBuilder
@onready var stats_label: Label = $HUD/TopPanel/VBox/StatsLabel
@onready var mission_label: Label = $HUD/TopPanel/VBox/MissionLabel

var player: CharacterBody3D
var vehicles: Array[Node3D] = []
var active_vehicle: Node3D = null
var cash: int = 250
var wanted_stars: int = 0
var checkpoint_node: Area3D
var checkpoint_index: int = 0
var mission_points: Array[Vector3] = [
\tVector3(24, 1.2, -18),
\tVector3(-30, 1.2, -26),
\tVector3(-22, 1.2, 30),
\tVector3(34, 1.2, 24),
\tVector3(0, 1.2, -40)
]

func _ready() -> void:
\t_setup_vice_sky()
\tcity_builder.call("build_vice_city")
\t_spawn_player()
\t_spawn_vehicles()
\t_spawn_traffic()
\t_spawn_checkpoint()
\t_update_hud()

func _setup_vice_sky() -> void:
\tvar env_node := WorldEnvironment.new()
\tvar env := Environment.new()
\tvar sky := Sky.new()
\tvar sky_mat := ProceduralSkyMaterial.new()
\tsky_mat.sky_top_color = Color(0.08, 0.05, 0.22)
\tsky_mat.sky_horizon_color = Color(0.95, 0.42, 0.56)
\tsky_mat.ground_bottom_color = Color(0.05, 0.06, 0.1)
\tsky_mat.ground_horizon_color = Color(0.25, 0.15, 0.3)
\tsky.sky_material = sky_mat
\tenv.background_mode = Environment.BG_SKY
\tenv.sky = sky
\tenv.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
\tenv.ambient_light_energy = 0.65
\tenv.glow_enabled = true
\tenv_node.environment = env
\tadd_child(env_node)

func _spawn_player() -> void:
\tplayer = CharacterBody3D.new()
\tplayer.name = "RobloxAvatar"
\tplayer.set_script(PlayerScript)
\tplayer.position = Vector3(0, 2.0, 8)
\tadd_child(player)

func _spawn_vehicles() -> void:
\tvar specs := [
\t\t{ "pos": Vector3(6, 0.7, 4), "color": Color(0.96, 0.18, 0.45), "name": "ViceGT_Pink" },
\t\t{ "pos": Vector3(-8, 0.7, -4), "color": Color(0.14, 0.78, 0.96), "name": "CyberLambo_Cyan" },
\t\t{ "pos": Vector3(18, 0.7, 16), "color": Color(0.96, 0.74, 0.16), "name": "GoldViper" }
\t]
\tfor s in specs:
\t\tvar car := CharacterBody3D.new()
\t\tcar.name = s["name"]
\t\tcar.set_script(VehicleScript)
\t\tcar.position = s["pos"]
\t\tcar.set("body_color", s["color"])
\t\tadd_child(car)
\t\tvehicles.append(car)

func _spawn_traffic() -> void:
\tvar traffic := Node3D.new()
\ttraffic.name = "CityTraffic"
\ttraffic.set_script(TrafficScript)
\tadd_child(traffic)

func _spawn_checkpoint() -> void:
\tcheckpoint_node = Area3D.new()
\tcheckpoint_node.name = "MissionCheckpoint"
\tvar shape := CollisionShape3D.new()
\tvar cyl := CylinderShape3D.new()
\tcyl.radius = 3.2
\tcyl.height = 5.0
\tshape.shape = cyl
\tcheckpoint_node.add_child(shape)

\tvar ring := MeshInstance3D.new()
\tvar cyl_mesh := CylinderMesh.new()
\tcyl_mesh.top_radius = 2.8
\tcyl_mesh.bottom_radius = 2.8
\tcyl_mesh.height = 0.25
\tring.mesh = cyl_mesh
\tvar mat := StandardMaterial3D.new()
\tmat.albedo_color = Color(1.0, 0.82, 0.2, 0.85)
\tmat.emission_enabled = true
\tmat.emission = Color(1.0, 0.75, 0.15)
\tmat.emission_energy_multiplier = 2.4
\tmat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
\tring.material_override = mat
\tcheckpoint_node.add_child(ring)

\tcheckpoint_node.position = mission_points[checkpoint_index]
\tcheckpoint_node.body_entered.connect(_on_checkpoint_reached)
\tadd_child(checkpoint_node)

func _on_checkpoint_reached(body: Node3D) -> void:
\tif body == player or body == active_vehicle:
\t\tcash += 500
\t\tcheckpoint_index = (checkpoint_index + 1) % mission_points.size()
\t\tcheckpoint_node.position = mission_points[checkpoint_index]
\t\tmission_label.text = "Checkpoint Cleared! +$500 — Next target active!"
\t\t_update_hud()

func _unhandled_input(event: InputEvent) -> void:
\tif event is InputEventKey and event.pressed and not event.echo:
\t\tif event.keycode == KEY_E:
\t\t\t_toggle_vehicle()
\t\telif event.keycode == KEY_R:
\t\t\t_respawn()

func _toggle_vehicle() -> void:
\tif active_vehicle != null:
\t\tactive_vehicle.call("set_driven", false)
\t\tplayer.position = active_vehicle.position + Vector3(3.0, 1.4, 0)
\t\tplayer.visible = true
\t\tplayer.call("set_active", true)
\t\tactive_vehicle = null
\t\t_update_hud()
\t\treturn

\tvar nearest: Node3D = null
\tvar best_dist := 6.0
\tfor car in vehicles:
\t\tvar d := player.global_position.distance_to(car.global_position)
\t\tif d < best_dist:
\t\t\tbest_dist = d
\t\t\tnearest = car

\tif nearest != null:
\t\tactive_vehicle = nearest
\t\tplayer.visible = false
\t\tplayer.call("set_active", false)
\t\tactive_vehicle.call("set_driven", true)
\t\twanted_stars = min(5, wanted_stars + 1)
\t\t_update_hud()

func _respawn() -> void:
\tif active_vehicle != null:
\t\tactive_vehicle.position = Vector3(6, 1.2, 4)
\t\tactive_vehicle.rotation = Vector3.ZERO
\telse:
\t\tplayer.position = Vector3(0, 2.5, 8)
\twanted_stars = 0
\t_update_hud()

func _process(delta: float) -> void:
\tif checkpoint_node:
\t\tcheckpoint_node.rotate_y(delta * 1.8)
\tif active_vehicle != null:
\t\tplayer.global_position = active_vehicle.global_position

func _update_hud() -> void:
\tvar stars := ""
\tfor i in range(5):
\t\tstars += "★" if i < wanted_stars else "☆"
\tvar mode_txt := ("Driving " + active_vehicle.name) if active_vehicle else "On Foot (Roblox Avatar)"
\tstats_label.text = "$%d  |  Wanted: %s  |  %s" % [cash, stars, mode_txt]
`;

  const playerGd = `extends CharacterBody3D
## Blocky Roblox-Style Customizable 3D Avatar with Third-Person Spring Camera

const WALK_SPEED := 9.5
const SPRINT_SPEED := 16.0
const JUMP_VELOCITY := 11.5
const GRAVITY := 26.0

var is_active: bool = true
var outfit_index: int = 0
var outfits: Array[Dictionary] = [
\t{ "torso": Color(0.14, 0.52, 0.96), "legs": Color(0.14, 0.16, 0.24), "head": Color(0.98, 0.82, 0.42) },
\t{ "torso": Color(0.92, 0.2, 0.42), "legs": Color(0.1, 0.1, 0.14), "head": Color(0.95, 0.78, 0.62) },
\t{ "torso": Color(0.16, 0.82, 0.54), "legs": Color(0.18, 0.22, 0.3), "head": Color(0.98, 0.86, 0.48) },
\t{ "torso": Color(0.88, 0.68, 0.2), "legs": Color(0.12, 0.1, 0.18), "head": Color(0.96, 0.84, 0.64) }
]

var visual_root: Node3D
var torso_mesh: MeshInstance3D
var left_leg: MeshInstance3D
var right_leg: MeshInstance3D
var left_arm: MeshInstance3D
var right_arm: MeshInstance3D
var head_mesh: MeshInstance3D
var cam_pivot: Node3D
var camera: Camera3D
var walk_phase: float = 0.0

func _ready() -> void:
\tvar col := CollisionShape3D.new()
\tvar cap := CapsuleShape3D.new()
\tcap.radius = 0.55
\tcap.height = 1.9
\tcol.shape = cap
\tcol.position = Vector3(0, 1.0, 0)
\tadd_child(col)

\tvisual_root = Node3D.new()
\tadd_child(visual_root)

\thead_mesh = _make_block(Vector3(0.65, 0.65, 0.65), Vector3(0, 1.95, 0), outfits[0]["head"])
\ttorso_mesh = _make_block(Vector3(0.95, 0.95, 0.52), Vector3(0, 1.15, 0), outfits[0]["torso"])
\tleft_arm = _make_block(Vector3(0.32, 0.88, 0.34), Vector3(-0.68, 1.15, 0), outfits[0]["head"])
\tright_arm = _make_block(Vector3(0.32, 0.88, 0.34), Vector3(0.68, 1.15, 0), outfits[0]["head"])
\tleft_leg = _make_block(Vector3(0.38, 0.82, 0.42), Vector3(-0.24, 0.41, 0), outfits[0]["legs"])
\tright_leg = _make_block(Vector3(0.38, 0.82, 0.42), Vector3(0.24, 0.41, 0), outfits[0]["legs"])

\tcam_pivot = Node3D.new()
\tcam_pivot.position = Vector3(0, 2.2, 0)
\tadd_child(cam_pivot)

\tcamera = Camera3D.new()
\tcamera.position = Vector3(0, 3.2, 8.2)
\tcamera.rotation_degrees = Vector3(-16, 0, 0)
\tcamera.current = true
\tcam_pivot.add_child(camera)

func _make_block(sz: Vector3, pos: Vector3, col: Color) -> MeshInstance3D:
\tvar m := MeshInstance3D.new()
\tvar box := BoxMesh.new()
\tbox.size = sz
\tm.mesh = box
\tm.position = pos
\tvar mat := StandardMaterial3D.new()
\tmat.albedo_color = col
\tmat.roughness = 0.35
\tm.material_override = mat
\tvisual_root.add_child(m)
\treturn m

func set_active(active: bool) -> void:
\tis_active = active
\tif camera:
\t\tcamera.current = active

func _unhandled_input(event: InputEvent) -> void:
\tif not is_active:
\t\treturn
\tif event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_C:
\t\toutfit_index = (outfit_index + 1) % outfits.size()
\t\tvar o := outfits[outfit_index]
\t\t(torso_mesh.material_override as StandardMaterial3D).albedo_color = o["torso"]
\t\t(left_leg.material_override as StandardMaterial3D).albedo_color = o["legs"]
\t\t(right_leg.material_override as StandardMaterial3D).albedo_color = o["legs"]
\t\t(head_mesh.material_override as StandardMaterial3D).albedo_color = o["head"]

func _physics_process(delta: float) -> void:
\tif not is_active:
\t\treturn

\tif not is_on_floor():
\t\tvelocity.y -= GRAVITY * delta

\tif Input.is_key_pressed(KEY_SPACE) and is_on_floor():
\t\tvelocity.y = JUMP_VELOCITY

\tvar input_x := float(Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT)) - float(Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT))
\tvar input_z := float(Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN)) - float(Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP))
\tvar dir := Vector3(input_x, 0, input_z).normalized()
\tvar spd := SPRINT_SPEED if Input.is_key_pressed(KEY_SHIFT) else WALK_SPEED

\tif dir.length() > 0.05:
\t\tvelocity.x = move_toward(velocity.x, dir.x * spd, 42.0 * delta)
\t\tvelocity.z = move_toward(velocity.z, dir.z * spd, 42.0 * delta)
\t\tvisual_root.rotation.y = lerp_angle(visual_root.rotation.y, atan2(dir.x, dir.z), 10.0 * delta)
\t\twalk_phase += delta * (12.0 if spd == SPRINT_SPEED else 8.0)
\t\tvar swing := sin(walk_phase) * 0.65
\t\tleft_leg.rotation.x = swing
\t\tright_leg.rotation.x = -swing
\t\tleft_arm.rotation.x = -swing * 0.8
\t\tright_arm.rotation.x = swing * 0.8
\telse:
\t\tvelocity.x = move_toward(velocity.x, 0, 35.0 * delta)
\t\tvelocity.z = move_toward(velocity.z, 0, 35.0 * delta)
\t\tleft_leg.rotation.x = lerp(left_leg.rotation.x, 0.0, 10.0 * delta)
\t\tright_leg.rotation.x = lerp(right_leg.rotation.x, 0.0, 10.0 * delta)

\tmove_and_slide()
`;

  const vehicleGd = `extends CharacterBody3D
## GTA-Style Drivable Neon Vice Sports Car with Nitro Boost & Chase Camera

@export var body_color: Color = Color(0.95, 0.2, 0.45)
@export var max_speed: float = 34.0
@export var nitro_speed: float = 48.0
@export var turn_speed: float = 2.4

var is_driven: bool = false
var current_speed: float = 0.0
var chase_cam: Camera3D

func _ready() -> void:
\tvar col := CollisionShape3D.new()
\tvar box := BoxShape3D.new()
\tbox.size = Vector3(2.2, 1.1, 4.5)
\tcol.shape = box
\tcol.position = Vector3(0, 0.65, 0)
\tadd_child(col)

\t# Chassis
\t_part(Vector3(2.2, 0.65, 4.4), Vector3(0, 0.55, 0), body_color, false)
\t# Cabin
\t_part(Vector3(1.85, 0.58, 2.0), Vector3(0, 1.12, -0.15), Color(0.1, 0.14, 0.22), false)
\t# Neon underglow strip
\t_part(Vector3(2.0, 0.08, 4.1), Vector3(0, 0.16, 0), body_color, true)
\t# Headlights
\t_part(Vector3(0.45, 0.18, 0.1), Vector3(-0.7, 0.62, -2.22), Color(1.0, 0.96, 0.78), true)
\t_part(Vector3(0.45, 0.18, 0.1), Vector3(0.7, 0.62, -2.22), Color(1.0, 0.96, 0.78), true)
\t# Taillights
\t_part(Vector3(1.8, 0.16, 0.1), Vector3(0, 0.65, 2.22), Color(1.0, 0.12, 0.22), true)

\t# 4 Wheels
\tfor wx in [-1.08, 1.08]:
\t\tfor wz in [-1.35, 1.35]:
\t\t\t_part(Vector3(0.32, 0.62, 0.62), Vector3(wx, 0.31, wz), Color(0.08, 0.08, 0.1), false)

\tchase_cam = Camera3D.new()
\tchase_cam.position = Vector3(0, 4.4, 9.6)
\tchase_cam.rotation_degrees = Vector3(-18, 0, 0)
\tchase_cam.current = false
\tadd_child(chase_cam)

func _part(sz: Vector3, pos: Vector3, col: Color, emissive: bool) -> void:
\tvar m := MeshInstance3D.new()
\tvar b := BoxMesh.new()
\tb.size = sz
\tm.mesh = b
\tm.position = pos
\tvar mat := StandardMaterial3D.new()
\tmat.albedo_color = col
\tmat.metallic = 0.45
\tmat.roughness = 0.22
\tif emissive:
\t\tmat.emission_enabled = true
\t\tmat.emission = col
\t\tmat.emission_energy_multiplier = 2.6
\tm.material_override = mat
\tadd_child(m)

func set_driven(state: bool) -> void:
\tis_driven = state
\tif chase_cam:
\t\tchase_cam.current = state

func _physics_process(delta: float) -> void:
\tif not is_on_floor():
\t\tvelocity.y -= 24.0 * delta

\tif not is_driven:
\t\tcurrent_speed = move_toward(current_speed, 0.0, 22.0 * delta)
\telse:
\t\tvar accel := float(Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP)) - float(Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN))
\t\tvar steer := float(Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT)) - float(Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT))
\t\tvar limit := nitro_speed if Input.is_key_pressed(KEY_SHIFT) else max_speed

\t\tif Input.is_key_pressed(KEY_SPACE):
\t\t\tcurrent_speed = move_toward(current_speed, 0.0, 46.0 * delta)
\t\telif abs(accel) > 0.01:
\t\t\tcurrent_speed = move_toward(current_speed, accel * limit, 28.0 * delta)
\t\telse:
\t\t\tcurrent_speed = move_toward(current_speed, 0.0, 14.0 * delta)

\t\tif abs(current_speed) > 0.6:
\t\t\tvar dir_sign := 1.0 if current_speed >= 0 else -1.0
\t\t\trotate_y(steer * turn_speed * delta * dir_sign)

\tvar forward := -global_transform.basis.z
\tvelocity.x = forward.x * current_speed
\tvelocity.z = forward.z * current_speed
\tmove_and_slide()
`;

  const cityBuilderGd = `extends Node3D
## Procedural Vice-City Neon Skyline, Palm Beach, Roads & Roblox Obby Jump Ramps

func build_vice_city() -> void:
\t# Base asphalt city ground
\t_static_box(Vector3(180, 1.0, 180), Vector3(0, -0.5, 0), Color(0.11, 0.12, 0.16), false)
\t# Golden beach & turquoise ocean strip on the East side
\t_static_box(Vector3(36, 0.4, 180), Vector3(72, -0.15, 0), Color(0.86, 0.75, 0.52), false)
\t_static_box(Vector3(60, 0.2, 180), Vector3(118, -0.25, 0), Color(0.06, 0.48, 0.66), false)

\t# Glowing boulevard road markings
\tfor z in range(-75, 76, 12):
\t\t_decor_box(Vector3(0.45, 0.06, 5.5), Vector3(0, 0.03, z), Color(0.98, 0.78, 0.25), true)
\tfor x in range(-75, 55, 12):
\t\t_decor_box(Vector3(5.5, 0.06, 0.45), Vector3(x, 0.03, 0), Color(0.98, 0.78, 0.25), true)

\t# Neon Vice Skyscrapers
\tvar towers := [
\t\t{ "pos": Vector3(-26, 12, -22), "sz": Vector3(12, 24, 12), "col": Color(0.12, 0.13, 0.22), "neon": Color(0.96, 0.22, 0.58) },
\t\t{ "pos": Vector3(-42, 18, 18), "sz": Vector3(14, 36, 14), "col": Color(0.1, 0.14, 0.24), "neon": Color(0.16, 0.82, 0.96) },
\t\t{ "pos": Vector3(24, 15, -30), "sz": Vector3(13, 30, 13), "col": Color(0.15, 0.12, 0.24), "neon": Color(0.98, 0.68, 0.18) },
\t\t{ "pos": Vector3(28, 10, 26), "sz": Vector3(11, 20, 11), "col": Color(0.12, 0.16, 0.22), "neon": Color(0.24, 0.92, 0.62) },
\t\t{ "pos": Vector3(-24, 9, 34), "sz": Vector3(10, 18, 10), "col": Color(0.16, 0.13, 0.2), "neon": Color(0.68, 0.36, 0.98) }
\t]
\tfor t in towers:
\t\t_static_box(t["sz"], t["pos"], t["col"], false)
\t\tvar top_y: float = t["pos"].y + t["sz"].y * 0.5 + 0.3
\t\t_decor_box(Vector3(t["sz"].x + 0.4, 0.55, t["sz"].z + 0.4), Vector3(t["pos"].x, top_y, t["pos"].z), t["neon"], true)

\t# Roblox-Style Floating Obby Parkour Platforms
\tvar obby_colors := [Color(0.98, 0.32, 0.44), Color(0.2, 0.78, 0.98), Color(0.98, 0.76, 0.2), Color(0.26, 0.9, 0.56)]
\tfor i in range(6):
\t\t_static_box(Vector3(4.2, 0.6, 4.2), Vector3(-12 - i * 4.5, 1.5 + i * 1.4, 12), obby_colors[i % obby_colors.size()], true)

\t# Vice Beach Palm Trees
\tfor pz in range(-50, 55, 16):
\t\t_static_box(Vector3(0.6, 7.0, 0.6), Vector3(58, 3.5, pz), Color(0.42, 0.28, 0.16), false)
\t\t_decor_box(Vector3(4.5, 0.45, 1.1), Vector3(58, 7.1, pz), Color(0.16, 0.68, 0.34), false)
\t\t_decor_box(Vector3(1.1, 0.45, 4.5), Vector3(58, 7.1, pz), Color(0.16, 0.68, 0.34), false)

func _static_box(sz: Vector3, pos: Vector3, col: Color, emissive: bool) -> void:
\tvar body := StaticBody3D.new()
\tbody.position = pos
\tvar cs := CollisionShape3D.new()
\tvar shape := BoxShape3D.new()
\tshape.size = sz
\tcs.shape = shape
\tbody.add_child(cs)
\tbody.add_child(_box_mesh(sz, col, emissive))
\tadd_child(body)

func _decor_box(sz: Vector3, pos: Vector3, col: Color, emissive: bool) -> void:
\tvar m := _box_mesh(sz, col, emissive)
\tm.position = pos
\tadd_child(m)

func _box_mesh(sz: Vector3, col: Color, emissive: bool) -> MeshInstance3D:
\tvar m := MeshInstance3D.new()
\tvar b := BoxMesh.new()
\tb.size = sz
\tm.mesh = b
\tvar mat := StandardMaterial3D.new()
\tmat.albedo_color = col
\tif emissive:
\t\tmat.emission_enabled = true
\t\tmat.emission = col
\t\tmat.emission_energy_multiplier = 1.9
\tm.material_override = mat
\treturn m
`;

  const npcTrafficGd = `extends Node3D
## Autonomous Roaming Vice Boulevard Traffic Cruisers

var cruisers: Array[Dictionary] = []

func _ready() -> void:
\tvar lanes := [
\t\t{ "z": -10.0, "dir": 1.0, "x": -55.0, "col": Color(0.95, 0.48, 0.18) },
\t\t{ "z": 10.0, "dir": -1.0, "x": 45.0, "col": Color(0.48, 0.32, 0.96) },
\t\t{ "z": -36.0, "dir": 1.0, "x": -20.0, "col": Color(0.2, 0.88, 0.72) }
\t]
\tfor lane in lanes:
\t\tvar m := MeshInstance3D.new()
\t\tvar b := BoxMesh.new()
\t\tb.size = Vector3(4.0, 1.1, 2.0)
\t\tm.mesh = b
\t\tm.position = Vector3(lane["x"], 0.65, lane["z"])
\t\tvar mat := StandardMaterial3D.new()
\t\tmat.albedo_color = lane["col"]
\t\tmat.emission_enabled = true
\t\tmat.emission = lane["col"] * 0.35
\t\tm.material_override = mat
\t\tadd_child(m)
\t\tcruisers.append({ "node": m, "dir": lane["dir"], "speed": 11.5 })

func _process(delta: float) -> void:
\tfor c in cruisers:
\t\tvar n: MeshInstance3D = c["node"]
\t\tn.position.x += c["dir"] * c["speed"] * delta
\t\tif n.position.x > 52.0:
\t\t\tn.position.x = -62.0
\t\telif n.position.x < -64.0:
\t\t\tn.position.x = 50.0
`;

  const readmeAr = `=== VALDRION CITY 6 — لعبة عالم مفتوح (Roblox × GTA 6) لمحرك Godot 4.3+ ===

طريقة التشغيل المباشر:
1. فك ضغط ملف الـ ZIP.
2. افتح Godot 4.3+ واضغط Import ثم اختر ملف project.godot.
3. اضغط F5 للتشغيل الفوري (جميع المجسمات 3D مبنية برمجياً بلا أخطاء ملفات مفقودة).

أزرار التحكم:
- W / A / S / D أو الأسهم: حركة الشخصية أو قيادة السيارة
- Space: القفز (Roblox) أو الفرامل
- Shift: الجري السريع أو النيترو الخارق للسيارة
- E: ركوب أقرب سيارة رياضية نيون أو النزول منها
- C: تغيير أزياء شخصية Roblox فوراً
- R: إعادة التموضع وتصفير نجوم المطاردة
`;

  const previewHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>VALDRION CITY 6 — Roblox x GTA 6 Sandbox</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #080b14; color: #f1f5f9; font-family: 'Segoe UI', Tahoma, sans-serif; overflow: hidden; height: 100vh; display: flex; flex-direction: column; }
  #hud { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 16px; background: rgba(12, 16, 28, 0.94); border-bottom: 1px solid rgba(96, 165, 250, 0.25); font-size: 13px; }
  .brand { font-weight: 900; letter-spacing: 0.06em; color: #f472b6; }
  .stats { display: flex; gap: 16px; align-items: center; font-weight: 700; }
  .cash { color: #34d399; font-family: monospace; font-size: 15px; }
  .stars { color: #fbbf24; letter-spacing: 2px; }
  .mode { color: #60a5fa; }
  .btns { display: flex; gap: 8px; }
  button { background: #1e293b; color: #f8fafc; border: 1px solid rgba(148,163,184,0.35); border-radius: 8px; padding: 6px 12px; font-size: 12px; font-weight: 700; cursor: pointer; }
  button:hover { border-color: #60a5fa; background: #26354d; }
  #stage { position: relative; flex: 1; width: 100%; overflow: hidden; }
  canvas { display: block; width: 100%; height: 100%; }
  #tips { position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); background: rgba(9, 13, 24, 0.86); border: 1px solid rgba(96,165,250,0.3); border-radius: 10px; padding: 7px 14px; font-size: 12px; color: #cbd5e1; white-space: nowrap; }
</style>
</head>
<body>
  <div id="hud">
    <div class="brand">VALDRION CITY 6 · ROBLOX × GTA 6</div>
    <div class="stats">
      <span class="cash" id="cashEl">$250</span>
      <span class="stars" id="starsEl">☆☆☆☆☆</span>
      <span class="mode" id="modeEl">سيراً على الأقدام (Roblox)</span>
    </div>
    <div class="btns">
      <button id="carBtn">ركوب / نزول سيارة (E)</button>
      <button id="skinBtn">تغيير زيّ Roblox (C)</button>
      <button id="resetBtn">إعادة (R)</button>
    </div>
  </div>
  <div id="stage">
    <canvas id="game"></canvas>
    <div id="tips">WASD أو الأسهم للحركة/القيادة · Shift نيترو · E ركوب سيارة GTA · اجمع دوائر المهام الذهبية (+500$)</div>
  </div>
<script>
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const cashEl = document.getElementById('cashEl');
const starsEl = document.getElementById('starsEl');
const modeEl = document.getElementById('modeEl');

function resize() {
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener('resize', resize);
resize();

const WORLD = { w: 1800, h: 1200 };
const outfits = [
  { torso: '#3b82f6', head: '#fde047', name: 'البطل الأزرق' },
  { torso: '#ec4899', head: '#fed7aa', name: 'فايس سيتي نيون' },
  { torso: '#10b981', head: '#fde68a', name: 'سيد الباركور' },
  { torso: '#f59e0b', head: '#fef08a', name: 'الذهبي الملكي' }
];
let outfitIdx = 0;
let cash = 250;
let wanted = 0;

const player = { x: 640, y: 580, vx: 0, vy: 0, angle: 0, inCar: null };
const cars = [
  { id: 'Vice GT Pink', x: 720, y: 560, angle: 0, speed: 0, color: '#f43f5e', glow: '#fb7185' },
  { id: 'Cyber Lambo', x: 520, y: 420, angle: Math.PI/2, speed: 0, color: '#06b6d4', glow: '#38bdf8' },
  { id: 'Gold Viper', x: 960, y: 740, angle: -Math.PI/2, speed: 0, color: '#f59e0b', glow: '#fbbf24' }
];
const buildings = [
  { x: 180, y: 120, w: 220, h: 170, neon: '#ec4899', label: 'VICE HOTEL' },
  { x: 180, y: 720, w: 230, h: 200, neon: '#38bdf8', label: 'ROBLOX TOWER' },
  { x: 860, y: 110, w: 240, h: 180, neon: '#fbbf24', label: 'VALDRION CLUB' },
  { x: 860, y: 760, w: 240, h: 190, neon: '#34d399', label: 'NEON MALL' },
  { x: 480, y: 120, w: 180, h: 140, neon: '#a855f7', label: 'OBBY ARENA' }
];
const traffic = [
  { x: 200, y: 500, vx: 2.8, color: '#fb923c' },
  { x: 1100, y: 610, vx: -3.1, color: '#a78bfa' },
  { x: 600, y: 340, vx: 2.3, color: '#2dd4bf' }
];
let mission = { x: 1160, y: 460, pulse: 0 };
const keys = {};

function updateHud() {
  cashEl.textContent = '$' + cash.toLocaleString();
  starsEl.textContent = '★'.repeat(wanted) + '☆'.repeat(5 - wanted);
  modeEl.textContent = player.inCar ? ('يقود: ' + player.inCar.id) : ('Roblox: ' + outfits[outfitIdx].name);
}

function toggleCar() {
  if (player.inCar) {
    player.x = player.inCar.x + 42;
    player.y = player.inCar.y;
    player.inCar = null;
    updateHud();
    return;
  }
  let best = null, bestD = 75;
  for (const c of cars) {
    const d = Math.hypot(c.x - player.x, c.y - player.y);
    if (d < bestD) { bestD = d; best = c; }
  }
  if (best) {
    player.inCar = best;
    wanted = Math.min(5, wanted + 1);
    updateHud();
  }
}

document.getElementById('carBtn').onclick = toggleCar;
document.getElementById('skinBtn').onclick = () => { outfitIdx = (outfitIdx + 1) % outfits.length; updateHud(); };
document.getElementById('resetBtn').onclick = () => { player.inCar = null; player.x = 640; player.y = 580; wanted = 0; updateHud(); };

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyE') toggleCar();
  if (e.code === 'KeyC') { outfitIdx = (outfitIdx + 1) % outfits.length; updateHud(); }
  if (e.code === 'KeyR') { player.inCar = null; player.x = 640; player.y = 580; wanted = 0; updateHud(); }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

function spawnNextMission() {
  const spots = [[1240, 460], [450, 560], [760, 880], [460, 340], [1180, 760]];
  const pick = spots[Math.floor(Math.random() * spots.length)];
  mission.x = pick[0];
  mission.y = pick[1];
}

function step() {
  const up = keys['KeyW'] || keys['ArrowUp'];
  const dn = keys['KeyS'] || keys['ArrowDown'];
  const lt = keys['KeyA'] || keys['ArrowLeft'];
  const rt = keys['KeyD'] || keys['ArrowRight'];
  const boost = keys['ShiftLeft'] || keys['ShiftRight'];

  if (player.inCar) {
    const c = player.inCar;
    const maxS = boost ? 11 : 7.2;
    if (up) c.speed = Math.min(maxS, c.speed + 0.32);
    else if (dn) c.speed = Math.max(-4.5, c.speed - 0.3);
    else c.speed *= 0.94;
    if (Math.abs(c.speed) > 0.3) {
      const dir = c.speed >= 0 ? 1 : -1;
      if (lt) c.angle -= 0.055 * dir;
      if (rt) c.angle += 0.055 * dir;
    }
    c.x = Math.max(40, Math.min(WORLD.w - 40, c.x + Math.cos(c.angle) * c.speed));
    c.y = Math.max(40, Math.min(WORLD.h - 40, c.y + Math.sin(c.angle) * c.speed));
    player.x = c.x; player.y = c.y;
  } else {
    const spd = boost ? 5.8 : 3.8;
    let dx = (rt ? 1 : 0) - (lt ? 1 : 0);
    let dy = (dn ? 1 : 0) - (up ? 1 : 0);
    const len = Math.hypot(dx, dy) || 1;
    player.x = Math.max(30, Math.min(WORLD.w - 30, player.x + (dx / len) * spd));
    player.y = Math.max(30, Math.min(WORLD.h - 30, player.y + (dy / len) * spd));
    if (dx || dy) player.angle = Math.atan2(dy, dx);
  }

  for (const t of traffic) {
    t.x += t.vx;
    if (t.x > 1420) t.x = 60;
    if (t.x < 60) t.x = 1420;
  }

  mission.pulse += 0.08;
  if (Math.hypot(player.x - mission.x, player.y - mission.y) < 42) {
    cash += 500;
    spawnNextMission();
    updateHud();
  }
}

function draw() {
  const camX = Math.max(0, Math.min(WORLD.w - canvas.width, player.x - canvas.width / 2));
  const camY = Math.max(0, Math.min(WORLD.h - canvas.height, player.y - canvas.height / 2));

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(-camX, -camY);

  // Vice Beach & Turquoise Ocean
  ctx.fillStyle = '#d4b483';
  ctx.fillRect(1380, 0, 170, WORLD.h);
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(1550, 0, 260, WORLD.h);

  // Roads
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 460, 1380, 190);
  ctx.fillRect(620, 0, 180, WORLD.h);
  ctx.strokeStyle = '#fbbf24';
  ctx.setLineDash([28, 22]);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 555); ctx.lineTo(1380, 555);
  ctx.moveTo(710, 0); ctx.lineTo(710, WORLD.h);
  ctx.stroke();
  ctx.setLineDash([]);

  // Buildings with neon trims
  for (const b of buildings) {
    ctx.fillStyle = '#111827';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = b.neon;
    ctx.lineWidth = 3;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.neon;
    ctx.font = 'bold 14px monospace';
    ctx.fillText(b.label, b.x + 14, b.y + 28);
  }

  // Beach Palms
  for (let py = 120; py < 1100; py += 160) {
    ctx.fillStyle = '#16a34a';
    ctx.beginPath(); ctx.arc(1430, py, 24, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#22c55e';
    ctx.beginPath(); ctx.arc(1430, py, 12, 0, Math.PI * 2); ctx.fill();
  }

  // Mission Checkpoint Ring
  const r = 24 + Math.sin(mission.pulse) * 6;
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(mission.x, mission.y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(251, 191, 36, 0.22)';
  ctx.fill();

  // Traffic
  for (const t of traffic) {
    ctx.fillStyle = t.color;
    ctx.fillRect(t.x - 22, t.y - 12, 44, 24);
  }

  // Drivable Neon Sports Cars
  for (const c of cars) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.angle);
    ctx.shadowColor = c.glow;
    ctx.shadowBlur = 16;
    ctx.fillStyle = c.color;
    ctx.fillRect(-26, -13, 52, 26);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-8, -10, 18, 20);
    ctx.fillStyle = '#fef9c3';
    ctx.fillRect(22, -10, 5, 6);
    ctx.fillRect(22, 4, 5, 6);
    ctx.restore();
  }

  // Blocky Roblox Avatar
  if (!player.inCar) {
    const o = outfits[outfitIdx];
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    ctx.fillStyle = o.torso;
    ctx.fillRect(-11, -13, 22, 26);
    ctx.fillStyle = o.head;
    ctx.fillRect(-7, -7, 14, 14);
    ctx.restore();
  }

  ctx.restore();

  // Mini-Map (GTA Style)
  const mw = 150, mh = 100, mx = 16, my = canvas.height - mh - 16;
  ctx.fillStyle = 'rgba(10, 14, 26, 0.85)';
  ctx.fillRect(mx, my, mw, mh);
  ctx.strokeStyle = 'rgba(96, 165, 250, 0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(mx, my, mw, mh);
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(mx + (mission.x / WORLD.w) * mw, my + (mission.y / WORLD.h) * mh, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(mx + (player.x / WORLD.w) * mw, my + (player.y / WORLD.h) * mh, 4.5, 0, Math.PI * 2);
  ctx.fill();
}

updateHud();
(function loop() { step(); draw(); requestAnimationFrame(loop); })();
</script>
</body>
</html>`;

  const project = normalizeGodotProjectPayload(
    {
      projectName: 'VALDRION CITY 6 — Roblox x GTA 6 Open World',
      dimension: '3d',
      summary:
        'لعبة عالم مفتوح ثلاثية الأبعاد 3D لمحرك Godot 4.3+ تجمع بين شخصية Roblox المكعّبة القابلة للتخصيص ومنصّات الباركور (Obby) وبين أجواء GTA 6 Vice City بسيارات رياضية نيون قابلة للقيادة والنيترو ونجوم المطاردة والمهام المالية.',
      mainScene: 'scenes/main.tscn',
      controls: [
        'WASD / الأسهم: حركة الشخصية أو قيادة السيارة',
        'E: ركوب أقرب سيارة رياضية نيون أو النزول منها',
        'Shift: الجري السريع أو تفعيل النيترو',
        'Space: القفز / الفرامل',
        'C: تبديل أزياء شخصية Roblox فوراً',
        'R: إعادة التموضع وتصفير نجوم المطاردة',
      ],
      files: [
        {
          path: 'scenes/main.tscn',
          description: 'المشهد الرئيسي ثلاثي الأبعاد مع الإضاءة والـ HUD',
          content: mainTscn,
        },
        {
          path: 'scripts/main.gd',
          description: 'مدير العالم المفتوح، نظام ركوب السيارات، المهام، ونجوم المطاردة',
          content: mainGd,
        },
        {
          path: 'scripts/player.gd',
          description: 'شخصية Roblox المكعّبة 3D مع تبديل الأزياء وكاميرا الشخص الثالث',
          content: playerGd,
        },
        {
          path: 'scripts/vehicle.gd',
          description: 'سيارات GTA 6 الرياضية النيون القابلة للقيادة مع النيترو وكاميرا المطاردة',
          content: vehicleGd,
        },
        {
          path: 'scripts/city_builder.gd',
          description: 'بناء مدينة فايس سيتي النيون، الشاطئ والنخيل، ومنصات باركور Roblox',
          content: cityBuilderGd,
        },
        {
          path: 'scripts/npc_traffic.gd',
          description: 'حركة المرور والسيارات ذاتية القيادة في شوارع المدينة',
          content: npcTrafficGd,
        },
        {
          path: 'README_AR.txt',
          description: 'دليل التشغيل السريع داخل محرك Godot 4.3+',
          content: readmeAr,
        },
      ],
      previewHtml,
    },
    {
      fallbackDimension: '3d',
      renderer: 'gl_compatibility',
      bridgeWsUrl: options?.bridgeWsUrl,
      pairCode: options?.pairCode,
    }
  );

  const guideMarkdown = `## 🌴 لعبة العالم المفتوح الجاهزة: **VALDRION CITY 6 (Roblox × GTA 6)** — لمحرك Godot 4.3+

تم بناء المشروع ثلاثي الأبعاد (3D) بالكامل وجاهز فوراً للعب هنا في المعاينة التفاعلية **وللفتح مباشرة في محرك Godot 4.3+** بضغطة F5 بدون أي ملفات مفقودة!

### أبرز ما تم بناؤه داخل اللعبة
- **شخصية Roblox 3D قابلة لتغيير الأزياء (\`scripts/player.gd\`)**: جسم مكعّب بحركة أرجل وأذرع ديناميكية وقفز وجري وتبديل فوري بين 4 أزياء بضغط **C**.
- **سيارات GTA 6 الرياضية النيون (\`scripts/vehicle.gd\`)**: 3 سيارات رياضية مضيئة في المدينة — اقترب واضغط **E** للركوب والقيادة بالنيترو (**Shift**) مع كاميرا مطاردة سينمائية ونظام **نجوم المطاردة ★★★★★**.
- **مدينة Vice City + منصات باركور Roblox (\`scripts/city_builder.gd\`)**: ناطحات سحاب بإضاءة نيون، شاطئ ونخيل، طرق مضيئة، ومنصات باركور عائمة (Obby)، بالإضافة إلى سيارات مرور متحركة (\`scripts/npc_traffic.gd\`).
- **نظام المهام والمال + الخريطة المصغّرة**: اتجه للحلقات الذهبية المضيئة لجمع **+$500** لكل مهمة!

> يمكنك الآن الضغط على **«العب المعاينة التفاعلية»** لتجربة المدينة والسيارات فوراً، أو **«تحميل مشروع Godot 4 (.zip)»** لفتحها وتشغيلها داخل محرك جودوت 4.3+، أو إرسالها مباشرة عبر **الجسر الحي (WebSocket)**.
`;

  return { project, guideMarkdown };
}
